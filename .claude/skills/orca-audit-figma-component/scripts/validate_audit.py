#!/usr/bin/env python3
"""Validate Figma component audit inventory, coverage, and evidence."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_COMPARISON_STATUSES = {
    "match",
    "mismatch",
    "not-asserted",
    "source-absent",
    "not-representable",
    "unresolved",
    "not-applicable",
}
FINDING_STATUSES = ALLOWED_COMPARISON_STATUSES - {"match", "not-applicable"}
ALLOWED_FINDING_KINDS = {
    "value-mismatch",
    "missing-in-implementation",
    "extra-in-implementation",
    "undocumented-in-spec",
    "missing-in-figma",
    "not-representable",
    "unresolved",
}
ALLOWED_SEVERITIES = {"critical", "high", "medium", "low", "info"}
ALLOWED_CONFIDENCE = {"high", "medium", "low"}
ALLOWED_EVIDENCE_KINDS = {"observed", "asserted", "inferred"}
ALLOWED_SOURCES = {
    "figma",
    "design",
    "implementation",
    "token",
    "storybook",
    "test",
    "other",
}
BASE_REQUIRED_CHECKS = {
    "container.background",
    "container.border",
    "container.radius",
    "container.size",
    "container.spacing",
    "label.typography",
    "label.foreground",
    "icon.size",
    "icon.foreground",
    "interaction.hover-active",
    "interaction.focus",
    "interaction.disabled",
    "interaction.state-distinction",
    "interaction.motion",
    "component.options",
    "accessibility.contrast",
    "accessibility.semantics",
}
REQUIRED_SOURCE_COMPARISONS = {
    "figma_vs_design",
    "figma_vs_implementation",
    "design_vs_implementation",
}
COMPARISON_EVIDENCE_SOURCES = {
    "figma_vs_design": {"figma", "design"},
    "figma_vs_implementation": {"figma", "implementation"},
    "design_vs_implementation": {"design", "implementation"},
}
REQUIRED_SNAPSHOT_FIELDS = {
    "container",
    "label",
    "icons",
    "componentProperties",
}
REQUIRED_CONTAINER_FIELDS = {
    "layoutMode",
    "primaryAxisSizingMode",
    "counterAxisSizingMode",
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "itemSpacing",
    "cornerRadius",
    "fills",
    "strokes",
    "strokeWeight",
    "effects",
    "opacity",
}
REQUIRED_LABEL_FIELDS = {
    "present",
    "text",
    "fontFamily",
    "fontStyle",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "fills",
}
REQUIRED_ICON_FIELDS = {
    "role",
    "present",
    "visible",
    "width",
    "height",
    "fills",
    "strokes",
}
REQUIRED_PAINT_FIELDS = {
    "type",
    "visible",
    "opacity",
    "rgba",
    "variableId",
    "resolved",
    "data",
}
REQUIRED_EFFECT_FIELDS = {
    "type",
    "visible",
    "radius",
    "spread",
    "offset",
    "color",
    "variableId",
    "data",
}
ALLOWED_PAINT_TYPES = {
    "SOLID",
    "GRADIENT_LINEAR",
    "GRADIENT_RADIAL",
    "GRADIENT_ANGULAR",
    "GRADIENT_DIAMOND",
    "IMAGE",
    "VIDEO",
    "PATTERN",
    "SHADER",
}
GRADIENT_PAINT_TYPES = {
    "GRADIENT_LINEAR",
    "GRADIENT_RADIAL",
    "GRADIENT_ANGULAR",
    "GRADIENT_DIAMOND",
}
MEDIA_PAINT_TYPES = {"IMAGE", "VIDEO"}
ALLOWED_MEDIA_SCALE_MODES = {"FILL", "FIT", "CROP", "TILE"}
ALLOWED_PATTERN_TILE_TYPES = {
    "RECTANGULAR",
    "HORIZONTAL_HEXAGONAL",
    "VERTICAL_HEXAGONAL",
}
ALLOWED_PATTERN_ALIGNMENTS = {"START", "CENTER", "END"}
ALLOWED_EFFECT_TYPES = {
    "DROP_SHADOW",
    "INNER_SHADOW",
    "LAYER_BLUR",
    "BACKGROUND_BLUR",
    "NOISE",
    "TEXTURE",
    "GLASS",
    "SHADER",
}
SHADOW_EFFECT_TYPES = {"DROP_SHADOW", "INNER_SHADOW"}
BLUR_EFFECT_TYPES = {"LAYER_BLUR", "BACKGROUND_BLUR"}
ALLOWED_COMPONENT_PROPERTY_TYPES = {
    "BOOLEAN",
    "TEXT",
    "INSTANCE_SWAP",
    "VARIANT",
}


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _escape_key_part(value: str) -> str:
    escaped = value.replace("\\", "\\\\")
    escaped = escaped.replace("|", "\\|")
    return escaped.replace("=", "\\=")


def canonical_variant_key(properties: dict[str, str]) -> str:
    return "|".join(
        f"{_escape_key_part(name)}={_escape_key_part(properties[name])}"
        for name in sorted(properties)
    )


def _fingerprint_projection(inventory: dict[str, Any]) -> dict[str, Any]:
    component = inventory.get("component", {})
    if not isinstance(component, dict):
        component = {}
    component_identity = {
        key: component.get(key) for key in ("name", "fileKey", "nodeId")
    }
    raw_variants = inventory.get("variants", [])
    if not isinstance(raw_variants, list):
        raw_variants = []
    variants = sorted(
        raw_variants,
        key=lambda item: (
            str(item.get("key", ""))
            if isinstance(item, dict)
            else _canonical_json(item)
        ),
    )
    return {
        "schemaVersion": inventory.get("schemaVersion"),
        "component": component_identity,
        "variantAxes": inventory.get("variantAxes"),
        "requireCartesianProduct": inventory.get("requireCartesianProduct"),
        "requiredChecks": sorted(
            inventory.get("requiredChecks", []), key=_canonical_json
        )
        if isinstance(inventory.get("requiredChecks"), list)
        else [],
        "requiredComparisons": sorted(
            inventory.get("requiredComparisons", []), key=_canonical_json
        )
        if isinstance(inventory.get("requiredComparisons"), list)
        else [],
        "variants": variants,
        "componentOptions": inventory.get("componentOptions", {}),
        "variables": inventory.get("variables", {}),
    }


def inventory_fingerprint(inventory: dict[str, Any]) -> str:
    encoded = _canonical_json(_fingerprint_projection(inventory)).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def capture_fingerprint(inventory: dict[str, Any]) -> str:
    capture = inventory.get("capture")
    if not isinstance(capture, dict):
        capture = {}
    inventory_entry = capture.get("inventory")
    if not isinstance(inventory_entry, dict):
        inventory_entry = {}
    parts = capture.get("parts")
    if not isinstance(parts, list):
        parts = []
    projection = {
        "inventory": {
            "id": inventory_entry.get("id"),
            "payloadFingerprint": inventory_entry.get("payloadFingerprint"),
        },
        "parts": sorted(
            [
                {
                    "id": part.get("id"),
                    "payloadFingerprint": part.get("payloadFingerprint"),
                }
                for part in parts
                if isinstance(part, dict)
            ],
            key=lambda part: str(part.get("id", "")),
        ),
    }
    encoded = _canonical_json(projection).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def _is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _parse_timestamp(value: Any) -> datetime | None:
    if not _is_nonempty_string(value):
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _is_number_or_none(value: Any) -> bool:
    return value is None or (
        isinstance(value, (int, float)) and not isinstance(value, bool)
    )


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _validate_rgba(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, dict) or set(value) != {"r", "g", "b", "a"}:
        errors.append(f"{prefix} must contain exactly r, g, b, a")
        return
    for channel in ("r", "g", "b", "a"):
        channel_value = value[channel]
        if not _is_number(channel_value) or not 0 <= channel_value <= 1:
            errors.append(f"{prefix}.{channel} must be a number from 0 to 1")


def _validate_vector(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, dict) or set(value) != {"x", "y"}:
        errors.append(f"{prefix} must contain exactly x and y")
        return
    if not _is_number(value["x"]) or not _is_number(value["y"]):
        errors.append(f"{prefix} x and y must be numbers")


def _validate_transform(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, list) or len(value) != 2:
        errors.append(f"{prefix} must be a 2x3 numeric transform")
        return
    for row in value:
        if (
            not isinstance(row, list)
            or len(row) != 3
            or any(not _is_number(item) for item in row)
        ):
            errors.append(f"{prefix} must be a 2x3 numeric transform")
            return


def _require_data_fields(
    data: dict[str, Any], required: set[str], prefix: str, errors: list[str]
) -> None:
    missing_fields = sorted(required - set(data))
    if missing_fields:
        errors.append(f"{prefix} is missing fields: {missing_fields}")


def _validate_nullable_transform(
    value: Any, prefix: str, errors: list[str]
) -> None:
    if value is not None:
        _validate_transform(value, prefix, errors)


def _validate_nullable_vector(value: Any, prefix: str, errors: list[str]) -> None:
    if value is not None:
        _validate_vector(value, prefix, errors)


def _is_meaningful_resolved_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list)):
        return bool(value)
    return True


def _validate_paint(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, dict):
        errors.append(f"{prefix} must be an object")
        return
    missing_fields = sorted(REQUIRED_PAINT_FIELDS - set(value))
    if missing_fields:
        errors.append(f"{prefix} is missing fields: {missing_fields}")
    raw_paint_type = value.get("type")
    paint_type = raw_paint_type if isinstance(raw_paint_type, str) else None
    if paint_type not in ALLOWED_PAINT_TYPES:
        errors.append(
            f"{prefix}.type must be one of {sorted(ALLOWED_PAINT_TYPES)}"
        )
    if not isinstance(value.get("visible"), bool):
        errors.append(f"{prefix}.visible must be boolean")
    opacity = value.get("opacity")
    if not _is_number(opacity) or not 0 <= opacity <= 1:
        errors.append(f"{prefix}.opacity must be a number from 0 to 1")
    rgba = value.get("rgba")
    if rgba is not None:
        _validate_rgba(rgba, f"{prefix}.rgba", errors)
    if paint_type == "SOLID" and rgba is None:
        errors.append(f"{prefix}.rgba is required for SOLID paint")
    if paint_type != "SOLID" and rgba is not None:
        errors.append(f"{prefix}.rgba must be null for non-SOLID paint")
    variable_id = value.get("variableId")
    if variable_id is not None and not (
        isinstance(variable_id, str) and variable_id.startswith("VariableID:")
    ):
        errors.append(f"{prefix}.variableId must be a VariableID string or null")
    if paint_type != "SOLID" and variable_id is not None:
        errors.append(f"{prefix}.variableId must be null for non-SOLID paint")
    if not _is_meaningful_resolved_value(value.get("resolved")):
        errors.append(f"{prefix}.resolved must contain a normalized resolved value")

    data = value.get("data")
    if not isinstance(data, dict):
        errors.append(f"{prefix}.data must be an object")
        return
    _require_data_fields(data, {"blendMode"}, f"{prefix}.data", errors)
    if not _is_nonempty_string(data.get("blendMode")):
        errors.append(f"{prefix}.data.blendMode must be a non-empty string")

    if paint_type == "SOLID":
        return

    if paint_type in GRADIENT_PAINT_TYPES:
        _require_data_fields(
            data,
            {"gradientTransform", "gradientStops"},
            f"{prefix}.data",
            errors,
        )
        _validate_transform(
            data.get("gradientTransform"),
            f"{prefix}.data.gradientTransform",
            errors,
        )
        stops = data.get("gradientStops")
        if not isinstance(stops, list) or not stops:
            errors.append(f"{prefix}.data.gradientStops must be a non-empty array")
        else:
            for index, stop in enumerate(stops):
                stop_prefix = f"{prefix}.data.gradientStops[{index}]"
                if not isinstance(stop, dict):
                    errors.append(f"{stop_prefix} must be an object")
                    continue
                _require_data_fields(
                    stop, {"position", "color", "variableId"}, stop_prefix, errors
                )
                position = stop.get("position")
                if not _is_number(position) or not 0 <= position <= 1:
                    errors.append(f"{stop_prefix}.position must be from 0 to 1")
                _validate_rgba(stop.get("color"), f"{stop_prefix}.color", errors)
                stop_variable_id = stop.get("variableId")
                if stop_variable_id is not None and not (
                    isinstance(stop_variable_id, str)
                    and stop_variable_id.startswith("VariableID:")
                ):
                    errors.append(
                        f"{stop_prefix}.variableId must be a VariableID string or null"
                    )
        return

    if paint_type in MEDIA_PAINT_TYPES:
        hash_field = "imageHash" if paint_type == "IMAGE" else "videoHash"
        transform_field = (
            "imageTransform" if paint_type == "IMAGE" else "videoTransform"
        )
        _require_data_fields(
            data,
            {
                "scaleMode",
                hash_field,
                transform_field,
                "scalingFactor",
                "rotation",
                "filters",
            },
            f"{prefix}.data",
            errors,
        )
        scale_mode = data.get("scaleMode")
        if (
            not isinstance(scale_mode, str)
            or scale_mode not in ALLOWED_MEDIA_SCALE_MODES
        ):
            errors.append(
                f"{prefix}.data.scaleMode must be one of "
                f"{sorted(ALLOWED_MEDIA_SCALE_MODES)}"
            )
        asset_hash = data.get(hash_field)
        if asset_hash is not None and not _is_nonempty_string(asset_hash):
            errors.append(f"{prefix}.data.{hash_field} must be a string or null")
        if value.get("visible") is True and not _is_nonempty_string(asset_hash):
            errors.append(
                f"{prefix}.data.{hash_field} must identify the visible asset"
            )
        _validate_nullable_transform(
            data.get(transform_field), f"{prefix}.data.{transform_field}", errors
        )
        scaling_factor = data.get("scalingFactor")
        if scaling_factor is not None and (
            not _is_number(scaling_factor) or scaling_factor <= 0
        ):
            errors.append(
                f"{prefix}.data.scalingFactor must be a positive number or null"
            )
        rotation = data.get("rotation")
        if rotation is not None and not _is_number(rotation):
            errors.append(f"{prefix}.data.rotation must be a number or null")
        if not isinstance(data.get("filters"), dict):
            errors.append(f"{prefix}.data.filters must be an object")
        return

    if paint_type == "PATTERN":
        _require_data_fields(
            data,
            {
                "sourceNodeId",
                "tileType",
                "scalingFactor",
                "spacing",
                "horizontalAlignment",
            },
            f"{prefix}.data",
            errors,
        )
        if not _is_nonempty_string(data.get("sourceNodeId")):
            errors.append(f"{prefix}.data.sourceNodeId must be a non-empty string")
        tile_type = data.get("tileType")
        if (
            not isinstance(tile_type, str)
            or tile_type not in ALLOWED_PATTERN_TILE_TYPES
        ):
            errors.append(
                f"{prefix}.data.tileType must be one of "
                f"{sorted(ALLOWED_PATTERN_TILE_TYPES)}"
            )
        scaling_factor = data.get("scalingFactor")
        if not _is_number(scaling_factor) or scaling_factor <= 0:
            errors.append(f"{prefix}.data.scalingFactor must be positive")
        _validate_vector(data.get("spacing"), f"{prefix}.data.spacing", errors)
        horizontal_alignment = data.get("horizontalAlignment")
        if (
            not isinstance(horizontal_alignment, str)
            or horizontal_alignment not in ALLOWED_PATTERN_ALIGNMENTS
        ):
            errors.append(
                f"{prefix}.data.horizontalAlignment must be one of "
                f"{sorted(ALLOWED_PATTERN_ALIGNMENTS)}"
            )
        return

    if paint_type == "SHADER":
        _require_data_fields(data, {"id", "properties"}, f"{prefix}.data", errors)
        if not _is_nonempty_string(data.get("id")):
            errors.append(f"{prefix}.data.id must be a non-empty string")
        if not isinstance(data.get("properties"), dict):
            errors.append(f"{prefix}.data.properties must be an object")


def _validate_paint_array(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, list):
        errors.append(f"{prefix} must be an array")
        return
    for index, paint in enumerate(value):
        _validate_paint(paint, f"{prefix}[{index}]", errors)


def _validate_effect(value: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(value, dict):
        errors.append(f"{prefix} must be an object")
        return
    missing_fields = sorted(REQUIRED_EFFECT_FIELDS - set(value))
    if missing_fields:
        errors.append(f"{prefix} is missing fields: {missing_fields}")
    raw_effect_type = value.get("type")
    effect_type = raw_effect_type if isinstance(raw_effect_type, str) else None
    if effect_type not in ALLOWED_EFFECT_TYPES:
        errors.append(
            f"{prefix}.type must be one of {sorted(ALLOWED_EFFECT_TYPES)}"
        )
    if not isinstance(value.get("visible"), bool):
        errors.append(f"{prefix}.visible must be boolean")
    for field in ("radius", "spread"):
        if not _is_number_or_none(value.get(field)):
            errors.append(f"{prefix}.{field} must be a number or null")
    offset = value.get("offset")
    if offset is not None:
        _validate_vector(offset, f"{prefix}.offset", errors)
    color = value.get("color")
    if color is not None:
        _validate_rgba(color, f"{prefix}.color", errors)
    variable_id = value.get("variableId")
    if variable_id is not None and not (
        isinstance(variable_id, str) and variable_id.startswith("VariableID:")
    ):
        errors.append(f"{prefix}.variableId must be a VariableID string or null")

    data = value.get("data")
    if not isinstance(data, dict):
        errors.append(f"{prefix}.data must be an object")
        return

    radius = value.get("radius")
    spread = value.get("spread")
    if effect_type in SHADOW_EFFECT_TYPES:
        if not _is_number(radius) or radius < 0:
            errors.append(f"{prefix}.radius must be a non-negative number")
        if not _is_number(spread):
            errors.append(f"{prefix}.spread must be a normalized number")
        if offset is None:
            errors.append(f"{prefix}.offset is required for shadow effects")
        if color is None:
            errors.append(f"{prefix}.color is required for shadow effects")
        _require_data_fields(data, {"blendMode"}, f"{prefix}.data", errors)
        if not _is_nonempty_string(data.get("blendMode")):
            errors.append(f"{prefix}.data.blendMode must be a non-empty string")
        if effect_type == "DROP_SHADOW":
            _require_data_fields(
                data, {"showShadowBehindNode"}, f"{prefix}.data", errors
            )
            if not isinstance(data.get("showShadowBehindNode"), bool):
                errors.append(
                    f"{prefix}.data.showShadowBehindNode must be boolean"
                )
        return

    if effect_type in BLUR_EFFECT_TYPES:
        if not _is_number(radius) or radius < 0:
            errors.append(f"{prefix}.radius must be a non-negative number")
        for field, field_value in (
            ("spread", spread),
            ("offset", offset),
            ("color", color),
        ):
            if field_value is not None:
                errors.append(f"{prefix}.{field} must be null for blur effects")
        _require_data_fields(
            data,
            {"blurType", "startRadius", "startOffset", "endOffset"},
            f"{prefix}.data",
            errors,
        )
        raw_blur_type = data.get("blurType")
        blur_type = raw_blur_type if isinstance(raw_blur_type, str) else None
        if blur_type not in {"NORMAL", "PROGRESSIVE"}:
            errors.append(f"{prefix}.data.blurType must be NORMAL or PROGRESSIVE")
        if blur_type == "PROGRESSIVE":
            start_radius = data.get("startRadius")
            if not _is_number(start_radius) or start_radius < 0:
                errors.append(
                    f"{prefix}.data.startRadius must be a non-negative number"
                )
            _validate_vector(
                data.get("startOffset"), f"{prefix}.data.startOffset", errors
            )
            _validate_vector(
                data.get("endOffset"), f"{prefix}.data.endOffset", errors
            )
        elif blur_type == "NORMAL":
            for field in ("startRadius", "startOffset", "endOffset"):
                if data.get(field) is not None:
                    errors.append(
                        f"{prefix}.data.{field} must be null for NORMAL blur"
                    )
        return

    if effect_type == "NOISE":
        for field, field_value in (
            ("radius", radius),
            ("spread", spread),
            ("offset", offset),
        ):
            if field_value is not None:
                errors.append(f"{prefix}.{field} must be null for NOISE")
        if color is None:
            errors.append(f"{prefix}.color is required for NOISE")
        if variable_id is not None:
            errors.append(f"{prefix}.variableId must be null for NOISE")
        _require_data_fields(
            data,
            {
                "blendMode",
                "noiseSize",
                "noiseSizeVector",
                "density",
                "noiseType",
                "secondaryColor",
                "opacity",
            },
            f"{prefix}.data",
            errors,
        )
        if not _is_nonempty_string(data.get("blendMode")):
            errors.append(f"{prefix}.data.blendMode must be a non-empty string")
        noise_size = data.get("noiseSize")
        if not _is_number(noise_size) or noise_size < 0:
            errors.append(f"{prefix}.data.noiseSize must be non-negative")
        _validate_nullable_vector(
            data.get("noiseSizeVector"),
            f"{prefix}.data.noiseSizeVector",
            errors,
        )
        density = data.get("density")
        if not _is_number(density) or not 0 <= density <= 1:
            errors.append(f"{prefix}.data.density must be from 0 to 1")
        raw_noise_type = data.get("noiseType")
        noise_type = raw_noise_type if isinstance(raw_noise_type, str) else None
        if noise_type not in {"MONOTONE", "DUOTONE", "MULTITONE"}:
            errors.append(
                f"{prefix}.data.noiseType must be MONOTONE, DUOTONE, or MULTITONE"
            )
        secondary_color = data.get("secondaryColor")
        noise_opacity = data.get("opacity")
        if noise_type == "DUOTONE":
            _validate_rgba(
                secondary_color, f"{prefix}.data.secondaryColor", errors
            )
        elif secondary_color is not None:
            errors.append(
                f"{prefix}.data.secondaryColor must be null unless noiseType is DUOTONE"
            )
        if noise_type == "MULTITONE":
            if not _is_number(noise_opacity) or not 0 <= noise_opacity <= 1:
                errors.append(f"{prefix}.data.opacity must be from 0 to 1")
        elif noise_opacity is not None:
            errors.append(
                f"{prefix}.data.opacity must be null unless noiseType is MULTITONE"
            )
        return

    if effect_type == "TEXTURE":
        for field, field_value in (
            ("spread", spread),
            ("offset", offset),
            ("color", color),
        ):
            if field_value is not None:
                errors.append(f"{prefix}.{field} must be null for TEXTURE")
        if not _is_number(radius) or radius < 0:
            errors.append(f"{prefix}.radius must be a non-negative number")
        if variable_id is not None:
            errors.append(f"{prefix}.variableId must be null for TEXTURE")
        _require_data_fields(
            data,
            {"noiseSize", "noiseSizeVector", "clipToShape"},
            f"{prefix}.data",
            errors,
        )
        noise_size = data.get("noiseSize")
        if not _is_number(noise_size) or noise_size < 0:
            errors.append(f"{prefix}.data.noiseSize must be non-negative")
        _validate_nullable_vector(
            data.get("noiseSizeVector"),
            f"{prefix}.data.noiseSizeVector",
            errors,
        )
        if not isinstance(data.get("clipToShape"), bool):
            errors.append(f"{prefix}.data.clipToShape must be boolean")
        return

    if effect_type == "GLASS":
        for field, field_value in (
            ("spread", spread),
            ("offset", offset),
            ("color", color),
        ):
            if field_value is not None:
                errors.append(f"{prefix}.{field} must be null for GLASS")
        if not _is_number(radius) or radius < 0:
            errors.append(f"{prefix}.radius must be a non-negative number")
        if variable_id is not None:
            errors.append(f"{prefix}.variableId must be null for GLASS")
        _require_data_fields(
            data,
            {"lightIntensity", "lightAngle", "refraction", "depth", "dispersion"},
            f"{prefix}.data",
            errors,
        )
        for field in ("lightIntensity", "refraction", "dispersion"):
            field_value = data.get(field)
            if not _is_number(field_value) or not 0 <= field_value <= 1:
                errors.append(f"{prefix}.data.{field} must be from 0 to 1")
        if not _is_number(data.get("lightAngle")):
            errors.append(f"{prefix}.data.lightAngle must be a number")
        if not _is_number(data.get("depth")) or data.get("depth") < 1:
            errors.append(f"{prefix}.data.depth must be at least 1")
        return

    if effect_type == "SHADER":
        for field, field_value in (
            ("radius", radius),
            ("spread", spread),
            ("offset", offset),
            ("color", color),
        ):
            if field_value is not None:
                errors.append(f"{prefix}.{field} must be null for SHADER")
        if variable_id is not None:
            errors.append(f"{prefix}.variableId must be null for SHADER")
        _require_data_fields(data, {"id", "properties"}, f"{prefix}.data", errors)
        if not _is_nonempty_string(data.get("id")):
            errors.append(f"{prefix}.data.id must be a non-empty string")
        if not isinstance(data.get("properties"), dict):
            errors.append(f"{prefix}.data.properties must be an object")


def _validate_typography_metric(
    value: Any,
    prefix: str,
    errors: list[str],
    *,
    allow_auto: bool,
    require_positive: bool,
) -> None:
    if not isinstance(value, dict) or set(value) != {"unit", "value"}:
        errors.append(f"{prefix} must contain exactly unit and value")
        return
    unit = value.get("unit")
    metric_value = value.get("value")
    allowed_units = {"PIXELS", "PERCENT"} | ({"AUTO"} if allow_auto else set())
    if not isinstance(unit, str) or unit not in allowed_units:
        errors.append(f"{prefix}.unit must be one of {sorted(allowed_units)}")
        return
    if unit == "AUTO":
        if metric_value is not None:
            errors.append(f"{prefix}.value must be null when unit is AUTO")
        return
    if not _is_number(metric_value) or (require_positive and metric_value <= 0):
        qualifier = "positive " if require_positive else ""
        errors.append(f"{prefix}.value must be a {qualifier}number")


def _validate_component_properties(
    value: Any, prefix: str, errors: list[str]
) -> None:
    if not isinstance(value, dict):
        errors.append(f"{prefix} must be an object")
        return
    for raw_key, definition in value.items():
        item_prefix = f"{prefix}.{raw_key}"
        if not _is_nonempty_string(raw_key):
            errors.append(f"{prefix} keys must be non-empty strings")
            continue
        if not isinstance(definition, dict):
            errors.append(f"{item_prefix} must be an object")
            continue
        property_type = definition.get("type")
        if (
            not isinstance(property_type, str)
            or property_type not in ALLOWED_COMPONENT_PROPERTY_TYPES
        ):
            errors.append(f"{item_prefix}.type is invalid")
            continue
        if "value" not in definition:
            errors.append(f"{item_prefix}.value is required")
            continue
        property_value = definition["value"]
        if property_type == "BOOLEAN" and not isinstance(property_value, bool):
            errors.append(f"{item_prefix}.value must be boolean")
        elif property_type in {"TEXT", "VARIANT"} and not isinstance(
            property_value, str
        ):
            errors.append(f"{item_prefix}.value must be a string")
        elif property_type == "INSTANCE_SWAP" and property_value is not None and not isinstance(
            property_value, str
        ):
            errors.append(f"{item_prefix}.value must be a string or null")


def _validate_component_options(value: dict[str, Any], errors: list[str]) -> None:
    for raw_key, definition in value.items():
        prefix = f"inventory.componentOptions.{raw_key}"
        if not _is_nonempty_string(raw_key):
            errors.append("inventory.componentOptions keys must be non-empty strings")
            continue
        if not isinstance(definition, dict):
            errors.append(f"{prefix} must be an object")
            continue
        property_type = definition.get("type")
        if (
            not isinstance(property_type, str)
            or property_type not in ALLOWED_COMPONENT_PROPERTY_TYPES - {"VARIANT"}
        ):
            errors.append(f"{prefix}.type is invalid for a component option")
            continue
        if "defaultValue" not in definition:
            errors.append(f"{prefix}.defaultValue is required")
            continue
        default_value = definition["defaultValue"]
        if property_type == "BOOLEAN" and not isinstance(default_value, bool):
            errors.append(f"{prefix}.defaultValue must be boolean")
        elif property_type == "TEXT" and not isinstance(default_value, str):
            errors.append(f"{prefix}.defaultValue must be a string")
        elif property_type == "INSTANCE_SWAP" and default_value is not None and not isinstance(
            default_value, str
        ):
            errors.append(f"{prefix}.defaultValue must be a string or null")
        preferred_values = definition.get("preferredValues", [])
        if not isinstance(preferred_values, list):
            errors.append(f"{prefix}.preferredValues must be an array")


def _validate_snapshot(snapshot: Any, prefix: str, errors: list[str]) -> None:
    if not isinstance(snapshot, dict):
        errors.append(f"{prefix} must be an object")
        return
    missing_snapshot_fields = sorted(REQUIRED_SNAPSHOT_FIELDS - set(snapshot))
    if missing_snapshot_fields:
        errors.append(
            f"{prefix} is missing required visual fields: {missing_snapshot_fields}"
        )

    container = snapshot.get("container")
    if not isinstance(container, dict):
        errors.append(f"{prefix}.container must be an object")
    else:
        missing_container_fields = sorted(REQUIRED_CONTAINER_FIELDS - set(container))
        if missing_container_fields:
            errors.append(
                f"{prefix}.container is missing fields: {missing_container_fields}"
            )
        for field in (
            "layoutMode",
            "primaryAxisSizingMode",
            "counterAxisSizingMode",
        ):
            if not _is_nonempty_string(container.get(field)):
                errors.append(f"{prefix}.container.{field} must be a non-empty string")
        for field in ("width", "height"):
            field_value = container.get(field)
            if not _is_number(field_value) or field_value < 0:
                errors.append(
                    f"{prefix}.container.{field} must be a non-negative number"
                )
        for field in ("minWidth", "maxWidth", "minHeight", "maxHeight"):
            field_value = container.get(field)
            if not _is_number_or_none(field_value) or (
                _is_number(field_value) and field_value < 0
            ):
                errors.append(
                    f"{prefix}.container.{field} must be a non-negative number or null"
                )
        for field in (
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
        ):
            field_value = container.get(field)
            if not _is_number(field_value) or field_value < 0:
                errors.append(
                    f"{prefix}.container.{field} must be a non-negative number"
                )
        if not _is_number(container.get("itemSpacing")):
            errors.append(f"{prefix}.container.itemSpacing must be a number")
        corner_radius = container.get("cornerRadius")
        if _is_number(corner_radius):
            if corner_radius < 0:
                errors.append(
                    f"{prefix}.container.cornerRadius must be non-negative"
                )
        elif isinstance(corner_radius, dict) and set(corner_radius) == {
            "topLeft",
            "topRight",
            "bottomRight",
            "bottomLeft",
        }:
            if any(
                not _is_number(radius) or radius < 0
                for radius in corner_radius.values()
            ):
                errors.append(
                    f"{prefix}.container.cornerRadius values must be non-negative numbers"
                )
        else:
            errors.append(
                f"{prefix}.container.cornerRadius must be a number or four-corner object"
            )
        stroke_weight = container.get("strokeWeight")
        if _is_number(stroke_weight):
            if stroke_weight < 0:
                errors.append(f"{prefix}.container.strokeWeight must be non-negative")
        elif isinstance(stroke_weight, dict) and set(stroke_weight) == {
            "top",
            "right",
            "bottom",
            "left",
        }:
            if any(
                not _is_number(weight) or weight < 0
                for weight in stroke_weight.values()
            ):
                errors.append(
                    f"{prefix}.container.strokeWeight values must be non-negative numbers"
                )
        else:
            errors.append(
                f"{prefix}.container.strokeWeight must be a number or four-side object"
            )
        opacity = container.get("opacity")
        if not _is_number(opacity) or not 0 <= opacity <= 1:
            errors.append(f"{prefix}.container.opacity must be a number from 0 to 1")
        _validate_paint_array(
            container.get("fills"), f"{prefix}.container.fills", errors
        )
        _validate_paint_array(
            container.get("strokes"), f"{prefix}.container.strokes", errors
        )
        effects = container.get("effects")
        if not isinstance(effects, list):
            errors.append(f"{prefix}.container.effects must be an array")
        else:
            for index, effect in enumerate(effects):
                _validate_effect(
                    effect, f"{prefix}.container.effects[{index}]", errors
                )

    label = snapshot.get("label")
    if not isinstance(label, dict):
        errors.append(f"{prefix}.label must be an object")
    else:
        missing_label_fields = sorted(REQUIRED_LABEL_FIELDS - set(label))
        if missing_label_fields:
            errors.append(f"{prefix}.label is missing fields: {missing_label_fields}")
        label_present = label.get("present")
        if not isinstance(label_present, bool):
            errors.append(f"{prefix}.label.present must be boolean")
        if label_present is True:
            if not isinstance(label.get("text"), str):
                errors.append(f"{prefix}.label.text must be a string when present")
            for field in ("fontFamily", "fontStyle"):
                if not _is_nonempty_string(label.get(field)):
                    errors.append(
                        f"{prefix}.label.{field} must be a non-empty string when present"
                    )
            font_size = label.get("fontSize")
            if not _is_number(font_size) or font_size <= 0:
                errors.append(
                    f"{prefix}.label.fontSize must be a positive number when present"
                )
            _validate_typography_metric(
                label.get("lineHeight"),
                f"{prefix}.label.lineHeight",
                errors,
                allow_auto=True,
                require_positive=True,
            )
            _validate_typography_metric(
                label.get("letterSpacing"),
                f"{prefix}.label.letterSpacing",
                errors,
                allow_auto=False,
                require_positive=False,
            )
        elif label_present is False:
            for field in (
                "text",
                "fontFamily",
                "fontStyle",
                "fontSize",
                "lineHeight",
                "letterSpacing",
            ):
                if label.get(field) is not None:
                    errors.append(
                        f"{prefix}.label.{field} must be null when label is absent"
                    )
        _validate_paint_array(label.get("fills"), f"{prefix}.label.fills", errors)

    icons = snapshot.get("icons")
    if not isinstance(icons, list):
        errors.append(f"{prefix}.icons must be an array")
    else:
        for index, icon in enumerate(icons):
            icon_prefix = f"{prefix}.icons[{index}]"
            if not isinstance(icon, dict):
                errors.append(f"{icon_prefix} must be an object")
                continue
            missing_icon_fields = sorted(REQUIRED_ICON_FIELDS - set(icon))
            if missing_icon_fields:
                errors.append(f"{icon_prefix} is missing fields: {missing_icon_fields}")
            if "role" in icon and not _is_nonempty_string(icon["role"]):
                errors.append(f"{icon_prefix}.role must be a non-empty string")
            for field in ("present", "visible"):
                if field in icon and not isinstance(icon[field], bool):
                    errors.append(f"{icon_prefix}.{field} must be boolean")
            if icon.get("present") is True:
                for field in ("width", "height"):
                    field_value = icon.get(field)
                    if not _is_number(field_value) or field_value < 0:
                        errors.append(
                            f"{icon_prefix}.{field} must be a non-negative number when present"
                        )
            elif icon.get("present") is False:
                for field in ("width", "height"):
                    if icon.get(field) is not None:
                        errors.append(
                            f"{icon_prefix}.{field} must be null when absent"
                        )
            _validate_paint_array(icon.get("fills"), f"{icon_prefix}.fills", errors)
            _validate_paint_array(
                icon.get("strokes"), f"{icon_prefix}.strokes", errors
            )

    _validate_component_properties(
        snapshot.get("componentProperties"),
        f"{prefix}.componentProperties",
        errors,
    )


def _expected_variant_keys(axes: dict[str, list[str]]) -> set[str]:
    axis_names = sorted(axes)
    if not axis_names or any(
        not _is_nonempty_string(name)
        or not isinstance(axes[name], list)
        or not axes[name]
        or any(not _is_nonempty_string(value) for value in axes[name])
        for name in axis_names
    ):
        return set()
    return {
        canonical_variant_key(dict(zip(axis_names, combination, strict=True)))
        for combination in itertools.product(*(axes[name] for name in axis_names))
    }


def _collect_snapshot_variable_ids(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for nested in value.values():
            found.update(_collect_snapshot_variable_ids(nested))
    elif isinstance(value, list):
        for nested in value:
            found.update(_collect_snapshot_variable_ids(nested))
    elif isinstance(value, str) and value.startswith("VariableID:"):
        found.add(value)
    return found


def _collect_alias_targets(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        alias = value.get("alias")
        if isinstance(alias, str):
            found.add(alias)
        for nested in value.values():
            found.update(_collect_alias_targets(nested))
    elif isinstance(value, list):
        for nested in value:
            found.update(_collect_alias_targets(nested))
    return found


def _find_alias_cycles(graph: dict[str, set[str]]) -> list[list[str]]:
    cycles: list[list[str]] = []
    visiting: list[str] = []
    state: dict[str, int] = {}

    def visit(node: str) -> None:
        if state.get(node) == 2:
            return
        if state.get(node) == 1:
            start = visiting.index(node)
            cycles.append(visiting[start:] + [node])
            return
        state[node] = 1
        visiting.append(node)
        for target in sorted(graph.get(node, set())):
            if target in graph:
                visit(target)
        visiting.pop()
        state[node] = 2

    for node in sorted(graph):
        visit(node)
    return cycles


def _capture_payload_fingerprint(raw_payload: str) -> str:
    return "sha256:" + hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()


def _parse_capture_entry(
    entry: Any, prefix: str, errors: list[str]
) -> tuple[str, dict[str, Any], datetime] | None:
    if not isinstance(entry, dict):
        errors.append(f"{prefix} must be an object")
        return None
    part_id = entry.get("id")
    raw_payload = entry.get("rawPayload")
    if not _is_nonempty_string(part_id):
        errors.append(f"{prefix}.id must be a non-empty string")
        return None
    if not isinstance(raw_payload, str) or not raw_payload:
        errors.append(f"{prefix}.rawPayload must contain the exact MCP text output")
        return None
    if "truncated to" in raw_payload.lower():
        errors.append(f"{prefix}.rawPayload contains a transport truncation marker")
    actual_fingerprint = _capture_payload_fingerprint(raw_payload)
    if entry.get("payloadFingerprint") != actual_fingerprint:
        errors.append(
            f"{prefix}.payloadFingerprint does not match rawPayload SHA-256"
        )
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as error:
        errors.append(f"{prefix}.rawPayload is not complete JSON: {error}")
        return None
    if not isinstance(payload, dict):
        errors.append(f"{prefix}.rawPayload must decode to an object")
        return None
    if payload.get("schemaVersion") != 1:
        errors.append(f"{prefix} payload schemaVersion must be 1")
    if payload.get("partId") != part_id:
        errors.append(f"{prefix} payload partId does not match entry id")
    captured_at = _parse_timestamp(payload.get("capturedAt"))
    if captured_at is None:
        errors.append(
            f"{prefix} payload capturedAt must be a timezone-aware ISO timestamp"
        )
    variants = payload.get("variants")
    if not isinstance(variants, list):
        errors.append(f"{prefix} payload variants must be an array")
        variants = []
    returned_count = payload.get("returnedCount")
    if returned_count != len(variants):
        errors.append(f"{prefix} payload returnedCount must equal variants length")
    expected_marker = f"FIGMA_AUDIT_COMPLETE:{part_id}:{returned_count}"
    if payload.get("endMarker") != expected_marker:
        errors.append(
            f"{prefix} payload endMarker missing or invalid; output may be truncated"
        )
    if captured_at is None:
        return None
    return part_id, payload, captured_at


def validate_inventory(inventory: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if inventory.get("schemaVersion") != 1:
        errors.append("inventory.schemaVersion must be 1")

    component = inventory.get("component")
    if not isinstance(component, dict):
        errors.append("inventory.component must be an object")
        component = {}
    for field in ("name", "fileKey", "nodeId"):
        if not _is_nonempty_string(component.get(field)):
            errors.append(f"inventory.component.{field} must be a non-empty string")
    component_captured_at = _parse_timestamp(component.get("capturedAt"))
    if component_captured_at is None:
        errors.append(
            "inventory.component.capturedAt must be a timezone-aware ISO timestamp"
        )

    axes = inventory.get("variantAxes")
    if not isinstance(axes, dict) or not axes:
        errors.append("inventory.variantAxes must be a non-empty object")
        axes = {}
    else:
        for name, values in axes.items():
            if not _is_nonempty_string(name):
                errors.append("variant axis names must be non-empty strings")
            if (
                not isinstance(values, list)
                or not values
                or any(not _is_nonempty_string(value) for value in values)
            ):
                errors.append(f"variantAxes.{name} must be a non-empty string array")
            elif len(values) != len(set(values)):
                errors.append(f"variantAxes.{name} contains duplicate values")

    required_checks = inventory.get("requiredChecks")
    if (
        not isinstance(required_checks, list)
        or not required_checks
        or any(not _is_nonempty_string(check) for check in required_checks)
    ):
        errors.append("inventory.requiredChecks must be a non-empty string array")
        required_checks = []
    elif len(required_checks) != len(set(required_checks)):
        errors.append("inventory.requiredChecks contains duplicates")
    missing_base_checks = sorted(BASE_REQUIRED_CHECKS - set(required_checks))
    if missing_base_checks:
        errors.append(
            f"inventory.requiredChecks is missing baseline checks: {missing_base_checks}"
        )

    required_comparisons = inventory.get("requiredComparisons")
    if (
        not isinstance(required_comparisons, list)
        or not required_comparisons
        or any(not _is_nonempty_string(pair) for pair in required_comparisons)
    ):
        errors.append("inventory.requiredComparisons must be a non-empty string array")
        required_comparisons = []
    elif len(required_comparisons) != len(set(required_comparisons)):
        errors.append("inventory.requiredComparisons contains duplicates")
    missing_source_comparisons = sorted(
        REQUIRED_SOURCE_COMPARISONS - set(required_comparisons)
    )
    unsupported_source_comparisons = sorted(
        set(required_comparisons) - REQUIRED_SOURCE_COMPARISONS
    )
    if missing_source_comparisons:
        errors.append(
            "inventory.requiredComparisons is missing source pairs: "
            f"{missing_source_comparisons}"
        )
    if unsupported_source_comparisons:
        errors.append(
            "inventory.requiredComparisons has unsupported source pairs: "
            f"{unsupported_source_comparisons}"
        )

    component_options = inventory.get("componentOptions")
    if not isinstance(component_options, dict):
        errors.append("inventory.componentOptions must be an object")
        component_options = {}
    else:
        _validate_component_options(component_options, errors)

    capture = inventory.get("capture")
    capture_inventory_rows: dict[str, dict[str, Any]] = {}
    capture_snapshot_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    capture_raw_variables: dict[str, Any] = {}
    capture_part_key_counts: Counter[str] = Counter()
    capture_part_ids: list[str] = []
    capture_times: list[datetime] = []
    if not isinstance(capture, dict):
        errors.append("inventory.capture must be an object")
    else:
        if capture.get("complete") is not True:
            errors.append("inventory.capture.complete must be true")
        if capture.get("truncated") is not False:
            errors.append("inventory.capture.truncated must be false")

        parsed_inventory = _parse_capture_entry(
            capture.get("inventory"), "inventory.capture.inventory", errors
        )
        if parsed_inventory:
            inventory_part_id, inventory_payload, inventory_capture_time = parsed_inventory
            capture_part_ids.append(inventory_part_id)
            capture_times.append(inventory_capture_time)
            raw_component = inventory_payload.get("component")
            if not isinstance(raw_component, dict):
                errors.append("inventory.capture.inventory payload component must be an object")
                raw_component = {}
            if raw_component.get("name") != component.get("name"):
                errors.append("capture inventory component name does not match inventory")
            if raw_component.get("nodeId") != component.get("nodeId"):
                errors.append("capture inventory component nodeId does not match inventory")
            if raw_component.get("fileKey") != component.get("fileKey"):
                errors.append("capture inventory component fileKey does not match inventory")
            if (
                component_captured_at is not None
                and inventory_capture_time != component_captured_at
            ):
                errors.append(
                    "inventory.component.capturedAt must equal raw inventory capturedAt"
                )
            if inventory_payload.get("variantAxes") != axes:
                errors.append("capture inventory variantAxes do not match inventory")
            if inventory_payload.get("componentOptions") != component_options:
                errors.append("capture inventory componentOptions do not match inventory")
            raw_variants = inventory_payload.get("variants")
            if not isinstance(raw_variants, list):
                raw_variants = []
            if raw_component.get("componentChildCount") != len(raw_variants):
                errors.append(
                    "capture inventory componentChildCount must equal returned variants"
                )
            for index, raw_variant in enumerate(raw_variants):
                prefix = f"inventory.capture.inventory payload variants[{index}]"
                if not isinstance(raw_variant, dict):
                    errors.append(f"{prefix} must be an object")
                    continue
                key = raw_variant.get("key")
                if not _is_nonempty_string(key):
                    errors.append(f"{prefix}.key must be a non-empty string")
                    continue
                if not _is_nonempty_string(raw_variant.get("nodeId")):
                    errors.append(f"{prefix}.nodeId must be a non-empty string")
                if not isinstance(raw_variant.get("properties"), dict):
                    errors.append(f"{prefix}.properties must be an object")
                if key in capture_inventory_rows:
                    errors.append(f"capture inventory duplicates variant key {key!r}")
                capture_inventory_rows[key] = raw_variant

        parts = capture.get("parts")
        if not isinstance(parts, list) or not parts:
            errors.append("inventory.capture.parts must be a non-empty array")
            parts = []
        for index, part in enumerate(parts):
            prefix = f"inventory.capture.parts[{index}]"
            parsed_part = _parse_capture_entry(part, prefix, errors)
            if not parsed_part:
                continue
            part_id, payload, part_capture_time = parsed_part
            capture_part_ids.append(part_id)
            capture_times.append(part_capture_time)
            raw_part_component = payload.get("component")
            if not isinstance(raw_part_component, dict):
                errors.append(f"{prefix} payload component must be an object")
                raw_part_component = {}
            if raw_part_component.get("fileKey") != component.get("fileKey"):
                errors.append(f"{prefix} payload component fileKey does not match inventory")
            if raw_part_component.get("nodeId") != component.get("nodeId"):
                errors.append(f"{prefix} payload component nodeId does not match inventory")
            requested_keys = payload.get("requestedVariantKeys")
            raw_variants = payload.get("variants")
            if not isinstance(requested_keys, list) or not requested_keys:
                errors.append(
                    f"{prefix} payload requestedVariantKeys must be a non-empty array"
                )
                requested_keys = []
            requested_key_strings = [
                key for key in requested_keys if _is_nonempty_string(key)
            ]
            if len(requested_key_strings) != len(requested_keys):
                errors.append(
                    f"{prefix} payload requestedVariantKeys must contain only non-empty strings"
                )
            if not isinstance(raw_variants, list):
                raw_variants = []
            if payload.get("expectedCount") != len(requested_keys):
                errors.append(
                    f"{prefix} payload expectedCount must equal requestedVariantKeys length"
                )
            returned_keys: list[str] = []
            for variant_index, raw_variant in enumerate(raw_variants):
                variant_prefix = f"{prefix} payload variants[{variant_index}]"
                if not isinstance(raw_variant, dict):
                    errors.append(f"{variant_prefix} must be an object")
                    continue
                key = raw_variant.get("key")
                if not _is_nonempty_string(key):
                    errors.append(f"{variant_prefix}.key must be a non-empty string")
                    continue
                if not _is_nonempty_string(raw_variant.get("nodeId")):
                    errors.append(f"{variant_prefix}.nodeId must be a non-empty string")
                _validate_snapshot(
                    raw_variant.get("snapshot"), f"{variant_prefix}.snapshot", errors
                )
                returned_keys.append(key)
                capture_part_key_counts[key] += 1
                capture_snapshot_rows[key].append(raw_variant)
            if len(requested_key_strings) != len(set(requested_key_strings)):
                errors.append(f"{prefix} payload requestedVariantKeys contains duplicates")
            if Counter(returned_keys) != Counter(requested_key_strings):
                errors.append(
                    f"{prefix} payload returned variant keys do not exactly match requestedVariantKeys"
                )
            raw_variables = payload.get("variables")
            if not isinstance(raw_variables, dict):
                errors.append(f"{prefix} payload variables must be an object")
                raw_variables = {}
            for variable_id, definition in raw_variables.items():
                if (
                    variable_id in capture_raw_variables
                    and capture_raw_variables[variable_id] != definition
                ):
                    errors.append(
                        f"capture parts disagree on variable definition {variable_id!r}"
                    )
                capture_raw_variables[variable_id] = definition
        duplicate_part_ids = sorted(
            part_id
            for part_id, count in Counter(capture_part_ids).items()
            if count > 1
        )
        if duplicate_part_ids:
            errors.append(f"duplicate capture part ids: {duplicate_part_ids}")

    variables = inventory.get("variables")
    if not isinstance(variables, dict):
        errors.append("inventory.variables must be an object")
        variables = {}
    alias_graph: dict[str, set[str]] = {}
    for variable_id, definition in variables.items():
        prefix = f"inventory.variables.{variable_id}"
        if not _is_nonempty_string(variable_id):
            errors.append("inventory variable IDs must be non-empty strings")
            continue
        if not isinstance(definition, dict):
            errors.append(f"{prefix} must be an object")
            continue
        if definition.get("missing") is True:
            errors.append(f"{prefix} is unresolved")
        if not _is_nonempty_string(definition.get("name")):
            errors.append(f"{prefix}.name must be a non-empty string")
        modes = definition.get("modes")
        if not isinstance(modes, dict) or not modes:
            errors.append(f"{prefix}.modes must be a non-empty object")
            modes = {}
        targets = _collect_alias_targets(modes)
        alias_graph[variable_id] = targets
        missing_targets = sorted(targets - set(variables))
        if missing_targets:
            errors.append(f"{prefix} has unresolved aliases: {missing_targets}")
    alias_cycles = _find_alias_cycles(alias_graph)
    if alias_cycles:
        errors.append(f"variable alias cycles: {alias_cycles}")
    if capture_raw_variables != variables:
        missing_raw_variables = sorted(set(variables) - set(capture_raw_variables))
        unknown_raw_variables = sorted(set(capture_raw_variables) - set(variables))
        differing_raw_variables = sorted(
            variable_id
            for variable_id in set(variables) & set(capture_raw_variables)
            if variables[variable_id] != capture_raw_variables[variable_id]
        )
        errors.append(
            "capture part variables do not match inventory.variables: "
            f"missing={missing_raw_variables}, unknown={unknown_raw_variables}, "
            f"different={differing_raw_variables}"
        )

    variants = inventory.get("variants")
    if not isinstance(variants, list) or not variants:
        errors.append("inventory.variants must be a non-empty array")
        variants = []

    keys: list[str] = []
    node_ids: list[str] = []
    axis_names = set(axes)
    referenced_variable_ids: set[str] = set()
    for index, variant in enumerate(variants):
        prefix = f"inventory.variants[{index}]"
        if not isinstance(variant, dict):
            errors.append(f"{prefix} must be an object")
            continue
        key = variant.get("key")
        node_id = variant.get("nodeId")
        properties = variant.get("properties")
        if not _is_nonempty_string(key):
            errors.append(f"{prefix}.key must be a non-empty string")
        else:
            keys.append(key)
        if not _is_nonempty_string(node_id):
            errors.append(f"{prefix}.nodeId must be a non-empty string")
        else:
            node_ids.append(node_id)
        if not isinstance(properties, dict):
            errors.append(f"{prefix}.properties must be an object")
            continue
        if set(properties) != axis_names:
            errors.append(
                f"{prefix}.properties axes must equal variantAxes axes; "
                f"got {sorted(properties)}, expected {sorted(axis_names)}"
            )
        if any(not _is_nonempty_string(value) for value in properties.values()):
            errors.append(f"{prefix}.properties values must be non-empty strings")
        for axis_name, value in properties.items():
            if axis_name in axes and value not in axes[axis_name]:
                errors.append(
                    f"{prefix}.properties.{axis_name} has unknown value {value!r}"
                )
        if _is_nonempty_string(key) and all(
            isinstance(name, str) and isinstance(value, str)
            for name, value in properties.items()
        ):
            expected_key = canonical_variant_key(properties)
            if key != expected_key:
                errors.append(
                    f"{prefix}.key is not canonical: got {key!r}, expected {expected_key!r}"
                )
        _validate_snapshot(variant.get("snapshot"), f"{prefix}.snapshot", errors)
        if isinstance(variant.get("snapshot"), dict):
            referenced_variable_ids.update(
                _collect_snapshot_variable_ids(variant["snapshot"])
            )

    missing_variable_definitions = sorted(referenced_variable_ids - set(variables))
    if missing_variable_definitions:
        errors.append(
            "snapshot references variables without definitions: "
            f"{missing_variable_definitions}"
        )

    duplicate_keys = sorted(key for key, count in Counter(keys).items() if count > 1)
    duplicate_node_ids = sorted(
        node_id for node_id, count in Counter(node_ids).items() if count > 1
    )
    if duplicate_keys:
        errors.append(f"duplicate inventory variant keys: {duplicate_keys}")
    if duplicate_node_ids:
        errors.append(f"duplicate inventory nodeIds: {duplicate_node_ids}")

    expected_keys = _expected_variant_keys(axes) if axes else set()
    actual_keys = set(keys)
    variant_by_key = {
        variant.get("key"): variant
        for variant in variants
        if isinstance(variant, dict) and _is_nonempty_string(variant.get("key"))
    }

    missing_inventory_capture_keys = sorted(
        actual_keys - set(capture_inventory_rows)
    )
    unknown_inventory_capture_keys = sorted(
        set(capture_inventory_rows) - actual_keys
    )
    if missing_inventory_capture_keys:
        errors.append(
            "raw capture inventory is missing variant keys: "
            f"{missing_inventory_capture_keys}"
        )
    if unknown_inventory_capture_keys:
        errors.append(
            "raw capture inventory contains unknown variant keys: "
            f"{unknown_inventory_capture_keys}"
        )

    missing_capture_keys = sorted(actual_keys - set(capture_part_key_counts))
    unknown_capture_keys = sorted(set(capture_part_key_counts) - actual_keys)
    duplicate_capture_keys = sorted(
        key for key, count in capture_part_key_counts.items() if count > 1
    )
    if missing_capture_keys:
        errors.append(f"capture parts missing variant keys: {missing_capture_keys}")
    if unknown_capture_keys:
        errors.append(f"capture parts contain unknown variant keys: {unknown_capture_keys}")
    if duplicate_capture_keys:
        errors.append(f"capture parts duplicate variant keys: {duplicate_capture_keys}")
    for key in sorted(actual_keys & set(capture_inventory_rows) & set(variant_by_key)):
        raw_variant = capture_inventory_rows[key]
        merged_variant = variant_by_key[key]
        if raw_variant.get("nodeId") != merged_variant.get("nodeId"):
            errors.append(f"raw capture inventory nodeId differs for {key}")
        if raw_variant.get("properties") != merged_variant.get("properties"):
            errors.append(f"raw capture inventory properties differ for {key}")
    for key in sorted(actual_keys & set(capture_snapshot_rows) & set(variant_by_key)):
        if len(capture_snapshot_rows[key]) != 1:
            continue
        raw_variant = capture_snapshot_rows[key][0]
        merged_variant = variant_by_key[key]
        if raw_variant.get("nodeId") != merged_variant.get("nodeId"):
            errors.append(f"raw capture snapshot nodeId differs for {key}")
        if raw_variant.get("snapshot") != merged_variant.get("snapshot"):
            errors.append(f"raw capture snapshot differs for {key}")
    missing_combinations = sorted(expected_keys - actual_keys)
    extra_combinations = sorted(actual_keys - expected_keys)
    if extra_combinations:
        errors.append(f"inventory keys outside variantAxes: {extra_combinations}")
    if missing_combinations:
        message = f"missing Cartesian combinations: {missing_combinations}"
        if inventory.get("requireCartesianProduct") is True:
            errors.append(message)
        else:
            warnings.append(message)
    if not isinstance(inventory.get("requireCartesianProduct"), bool):
        errors.append("inventory.requireCartesianProduct must be boolean")

    return {
        "errors": errors,
        "warnings": warnings,
        "variantKeys": sorted(actual_keys),
        "requiredChecks": required_checks,
        "requiredComparisons": required_comparisons,
        "expectedCombinationCount": len(expected_keys),
        "actualVariantCount": len(actual_keys),
        "missingCombinations": missing_combinations,
        "captureStartedAt": min(capture_times).isoformat()
        if capture_times
        else None,
        "captureCompletedAt": max(capture_times).isoformat()
        if capture_times
        else None,
        "captureFingerprint": capture_fingerprint(inventory),
        "fingerprint": inventory_fingerprint(inventory),
    }


def validate_audit(
    inventory: dict[str, Any],
    audit: dict[str, Any],
    postflight_inventory: dict[str, Any] | None = None,
) -> dict[str, Any]:
    inventory_result = validate_inventory(inventory)
    errors = list(inventory_result["errors"])
    warnings = list(inventory_result["warnings"])
    variant_keys = set(inventory_result["variantKeys"])
    required_checks = set(inventory_result["requiredChecks"])
    required_comparisons = set(inventory_result["requiredComparisons"])

    if audit.get("schemaVersion") != 1:
        errors.append("audit.schemaVersion must be 1")
    if audit.get("inventoryFingerprint") != inventory_result["fingerprint"]:
        errors.append(
            "audit.inventoryFingerprint does not match the current inventory fingerprint"
        )

    postflight_result: dict[str, Any] | None = None
    if not isinstance(postflight_inventory, dict):
        errors.append(
            "postflight inventory is required; repeat the full raw Figma capture after comparison"
        )
    else:
        postflight_result = validate_inventory(postflight_inventory)
        errors.extend(
            f"postflight: {error}" for error in postflight_result["errors"]
        )
        warnings.extend(
            f"postflight: {warning}" for warning in postflight_result["warnings"]
        )
        if postflight_result["fingerprint"] != inventory_result["fingerprint"]:
            errors.append(
                "Figma state changed between preflight and postflight inventories"
            )
        if (
            audit.get("postflightInventoryFingerprint")
            != postflight_result["fingerprint"]
        ):
            errors.append(
                "audit.postflightInventoryFingerprint does not match the provided "
                "postflight inventory"
            )
        preflight_completed_at = _parse_timestamp(
            inventory_result.get("captureCompletedAt")
        )
        postflight_started_at = _parse_timestamp(
            postflight_result.get("captureStartedAt")
        )
        if preflight_completed_at is None or postflight_started_at is None:
            errors.append("cannot verify preflight/postflight capture chronology")
        elif postflight_started_at <= preflight_completed_at:
            errors.append(
                "postflight capture must start after the preflight capture completes"
            )
        if capture_fingerprint(postflight_inventory) == capture_fingerprint(inventory):
            errors.append(
                "postflight raw capture is identical to preflight; a fresh MCP read is required"
            )

    assignment_owner: dict[str, str] = {}
    assignment_counts: Counter[str] = Counter()
    assignments = audit.get("assignments")
    if not isinstance(assignments, list) or not assignments:
        errors.append("audit.assignments must be a non-empty array")
        assignments = []
    for index, assignment in enumerate(assignments):
        prefix = f"audit.assignments[{index}]"
        if not isinstance(assignment, dict):
            errors.append(f"{prefix} must be an object")
            continue
        worker_id = assignment.get("workerId")
        keys = assignment.get("variantKeys")
        if not _is_nonempty_string(worker_id):
            errors.append(f"{prefix}.workerId must be a non-empty string")
            continue
        if not isinstance(keys, list) or not keys:
            errors.append(f"{prefix}.variantKeys must be a non-empty array")
            continue
        if assignment.get("inventoryFingerprint") != inventory_result["fingerprint"]:
            errors.append(
                f"{prefix}.inventoryFingerprint does not match the captured inventory"
            )
        for key in keys:
            if not _is_nonempty_string(key):
                errors.append(f"{prefix}.variantKeys contains an invalid key")
                continue
            assignment_counts[key] += 1
            assignment_owner.setdefault(key, worker_id)

    unknown_assignments = sorted(set(assignment_counts) - variant_keys)
    missing_assignments = sorted(variant_keys - set(assignment_counts))
    duplicate_assignments = sorted(
        key for key, count in assignment_counts.items() if count > 1
    )
    if unknown_assignments:
        errors.append(f"unknown assignment variant keys: {unknown_assignments}")
    if missing_assignments:
        errors.append(f"missing assignment variant keys: {missing_assignments}")
    if duplicate_assignments:
        errors.append(f"duplicate assignment variant keys: {duplicate_assignments}")

    coverage_by_key: dict[str, dict[str, dict[str, str]]] = {}
    coverage_counts: Counter[str] = Counter()
    coverage_workers: dict[str, str] = {}
    coverage = audit.get("coverage")
    if not isinstance(coverage, list):
        errors.append("audit.coverage must be an array")
        coverage = []
    for index, row in enumerate(coverage):
        prefix = f"audit.coverage[{index}]"
        if not isinstance(row, dict):
            errors.append(f"{prefix} must be an object")
            continue
        key = row.get("variantKey")
        worker_id = row.get("workerId")
        checks = row.get("checks")
        if not _is_nonempty_string(key):
            errors.append(f"{prefix}.variantKey must be a non-empty string")
            continue
        coverage_counts[key] += 1
        if _is_nonempty_string(worker_id):
            coverage_workers[key] = worker_id
        else:
            errors.append(f"{prefix}.workerId must be a non-empty string")
        if not isinstance(checks, dict):
            errors.append(f"{prefix}.checks must be an object")
            continue
        missing_checks = sorted(required_checks - set(checks))
        unknown_checks = sorted(set(checks) - required_checks)
        if missing_checks:
            errors.append(f"{prefix} missing required checks: {missing_checks}")
        if unknown_checks:
            errors.append(f"{prefix} has unknown checks: {unknown_checks}")
        for check, comparisons in checks.items():
            check_prefix = f"{prefix}.checks.{check}"
            if not isinstance(comparisons, dict):
                errors.append(f"{check_prefix} must be an object of source comparisons")
                continue
            missing_comparisons = sorted(required_comparisons - set(comparisons))
            unknown_comparisons = sorted(set(comparisons) - required_comparisons)
            if missing_comparisons:
                errors.append(
                    f"{check_prefix} missing required comparisons: {missing_comparisons}"
                )
            if unknown_comparisons:
                errors.append(
                    f"{check_prefix} has unknown comparisons: {unknown_comparisons}"
                )
            for comparison, status in comparisons.items():
                if (
                    not isinstance(status, str)
                    or status not in ALLOWED_COMPARISON_STATUSES
                ):
                    errors.append(
                        f"{check_prefix}.{comparison} has invalid status {status!r}"
                    )
        coverage_by_key.setdefault(key, checks)

    unknown_coverage = sorted(set(coverage_counts) - variant_keys)
    missing_coverage = sorted(variant_keys - set(coverage_counts))
    duplicate_coverage = sorted(
        key for key, count in coverage_counts.items() if count > 1
    )
    if unknown_coverage:
        errors.append(f"unknown coverage variant keys: {unknown_coverage}")
    if missing_coverage:
        errors.append(f"missing coverage variant keys: {missing_coverage}")
    if duplicate_coverage:
        errors.append(f"duplicate coverage variant keys: {duplicate_coverage}")
    for key in sorted(variant_keys & set(coverage_workers) & set(assignment_owner)):
        if coverage_workers[key] != assignment_owner[key]:
            errors.append(
                f"coverage worker mismatch for {key}: got {coverage_workers[key]!r}, "
                f"assigned to {assignment_owner[key]!r}"
            )

    finding_cells: set[tuple[str, str, str, str]] = set()
    finding_ids: list[str] = []
    semantic_findings: Counter[str] = Counter()
    findings = audit.get("findings")
    if not isinstance(findings, list):
        errors.append("audit.findings must be an array")
        findings = []
    status_counts: Counter[str] = Counter()
    severity_counts: Counter[str] = Counter()
    for index, finding in enumerate(findings):
        prefix = f"audit.findings[{index}]"
        if not isinstance(finding, dict):
            errors.append(f"{prefix} must be an object")
            continue
        finding_id = finding.get("id")
        finding_variant_keys = finding.get("variantKeys")
        check = finding.get("check")
        comparison = finding.get("comparison")
        property_name = finding.get("property")
        status = finding.get("status")
        kind = finding.get("kind")
        severity = finding.get("severity")
        confidence = finding.get("confidence")
        evidence = finding.get("evidence")

        if not _is_nonempty_string(finding_id):
            errors.append(f"{prefix}.id must be a non-empty string")
        else:
            finding_ids.append(finding_id)
        if not isinstance(finding_variant_keys, list) or not finding_variant_keys:
            errors.append(f"{prefix}.variantKeys must be a non-empty array")
            finding_variant_keys = []
        else:
            valid_finding_keys = [
                key for key in finding_variant_keys if _is_nonempty_string(key)
            ]
            if len(valid_finding_keys) != len(finding_variant_keys):
                errors.append(
                    f"{prefix}.variantKeys must contain only non-empty strings"
                )
            finding_variant_keys = valid_finding_keys
            if len(finding_variant_keys) != len(set(finding_variant_keys)):
                errors.append(f"{prefix}.variantKeys contains duplicates")
        unknown_finding_keys = sorted(set(finding_variant_keys) - variant_keys)
        if unknown_finding_keys:
            errors.append(f"{prefix} has unknown variant keys: {unknown_finding_keys}")
        if not isinstance(check, str) or check not in required_checks:
            errors.append(f"{prefix}.check must be one of requiredChecks")
        if not isinstance(comparison, str) or comparison not in required_comparisons:
            errors.append(f"{prefix}.comparison must be one of requiredComparisons")
        if not _is_nonempty_string(property_name):
            errors.append(f"{prefix}.property must be a non-empty string")
        if not isinstance(status, str) or status not in FINDING_STATUSES:
            errors.append(f"{prefix}.status has invalid finding status {status!r}")
        else:
            status_counts[status] += 1
        if not isinstance(kind, str) or kind not in ALLOWED_FINDING_KINDS:
            errors.append(f"{prefix}.kind has invalid value {kind!r}")
        if not isinstance(severity, str) or severity not in ALLOWED_SEVERITIES:
            errors.append(f"{prefix}.severity has invalid value {severity!r}")
        else:
            severity_counts[severity] += 1
        if not isinstance(confidence, str) or confidence not in ALLOWED_CONFIDENCE:
            errors.append(f"{prefix}.confidence has invalid value {confidence!r}")
        if not _is_nonempty_string(finding.get("summary")):
            errors.append(f"{prefix}.summary must be a non-empty string")

        evidence_sources: set[str] = set()
        if not isinstance(evidence, list) or not evidence:
            errors.append(f"{prefix}.evidence must be a non-empty array")
            evidence = []
        for evidence_index, item in enumerate(evidence):
            evidence_prefix = f"{prefix}.evidence[{evidence_index}]"
            if not isinstance(item, dict):
                errors.append(f"{evidence_prefix} must be an object")
                continue
            source = item.get("source")
            if not isinstance(source, str) or source not in ALLOWED_SOURCES:
                errors.append(f"{evidence_prefix}.source has invalid value {source!r}")
            else:
                evidence_sources.add(source)
            evidence_kind = item.get("kind")
            if (
                not isinstance(evidence_kind, str)
                or evidence_kind not in ALLOWED_EVIDENCE_KINDS
            ):
                errors.append(f"{evidence_prefix}.kind has an invalid value")
            if not _is_nonempty_string(item.get("locator")):
                errors.append(f"{evidence_prefix}.locator must be a non-empty string")
            if "value" not in item:
                errors.append(f"{evidence_prefix}.value is required, even when null")
        if status == "mismatch" and len(evidence_sources) < 2:
            errors.append(f"{prefix} mismatch requires evidence from at least two sources")
        if (
            status == "mismatch"
            and isinstance(comparison, str)
            and comparison in COMPARISON_EVIDENCE_SOURCES
        ):
            missing_evidence_sources = sorted(
                COMPARISON_EVIDENCE_SOURCES[comparison] - evidence_sources
            )
            if missing_evidence_sources:
                errors.append(
                    f"{prefix} mismatch is missing endpoint evidence: "
                    f"{missing_evidence_sources}"
                )

        for key in finding_variant_keys:
            if (
                isinstance(check, str)
                and isinstance(comparison, str)
                and isinstance(status, str)
            ):
                finding_cells.add((key, check, comparison, status))
        semantic_key = _canonical_json(
            {
                "variantKeys": sorted(finding_variant_keys),
                "check": check,
                "comparison": comparison,
                "property": property_name,
                "status": status,
                "kind": kind,
                "evidence": evidence,
            }
        )
        semantic_findings[semantic_key] += 1

    duplicate_finding_ids = sorted(
        finding_id for finding_id, count in Counter(finding_ids).items() if count > 1
    )
    if duplicate_finding_ids:
        errors.append(f"duplicate finding ids: {duplicate_finding_ids}")
    duplicate_semantic_count = sum(
        count - 1 for count in semantic_findings.values() if count > 1
    )
    if duplicate_semantic_count:
        errors.append(f"duplicate semantic findings: {duplicate_semantic_count}")

    uncovered_nonmatching_cells: list[str] = []
    unresolved_cells: list[str] = []
    checked_cell_count = 0
    for key, checks in coverage_by_key.items():
        if key not in variant_keys or not isinstance(checks, dict):
            continue
        for check in required_checks:
            if check not in checks:
                continue
            comparisons = checks[check]
            if not isinstance(comparisons, dict):
                continue
            for comparison in required_comparisons:
                if comparison not in comparisons:
                    continue
                checked_cell_count += 1
                status = comparisons[comparison]
                if not isinstance(status, str):
                    continue
                if status == "unresolved":
                    unresolved_cells.append(f"{key}::{check}::{comparison}")
                if status not in {"match", "not-applicable"} and (
                    key,
                    check,
                    comparison,
                    status,
                ) not in finding_cells:
                    uncovered_nonmatching_cells.append(
                        f"{key}::{check}::{comparison}::{status}"
                    )
    if uncovered_nonmatching_cells:
        errors.append(
            "non-matching coverage cells without corresponding findings: "
            f"{sorted(uncovered_nonmatching_cells)}"
        )

    unresolved = audit.get("unresolved")
    if not isinstance(unresolved, list):
        errors.append("audit.unresolved must be an array")
        unresolved = []
    for index, item in enumerate(unresolved):
        if not isinstance(item, dict) or not _is_nonempty_string(item.get("reason")):
            errors.append(f"audit.unresolved[{index}] must contain a non-empty reason")

    structurally_valid = not errors
    complete = (
        structurally_valid
        and not missing_assignments
        and not duplicate_assignments
        and not unknown_assignments
        and not missing_coverage
        and not duplicate_coverage
        and not unknown_coverage
        and not unresolved_cells
        and not unresolved
    )
    conformance_issue_count = sum(
        status_counts[status] for status in ("mismatch", "source-absent")
    )
    conformant = complete and conformance_issue_count == 0

    return {
        "valid": structurally_valid,
        "complete": complete,
        "conformant": conformant,
        "inventoryFingerprint": inventory_result["fingerprint"],
        "preflightCaptureFingerprint": inventory_result["captureFingerprint"],
        "postflightInventoryFingerprint": postflight_result["fingerprint"]
        if postflight_result
        else None,
        "postflightCaptureFingerprint": postflight_result["captureFingerprint"]
        if postflight_result
        else None,
        "inventory": {
            "actualVariantCount": inventory_result["actualVariantCount"],
            "expectedCombinationCount": inventory_result["expectedCombinationCount"],
            "missingCombinationCount": len(inventory_result["missingCombinations"]),
        },
        "coverage": {
            "assignedVariantCount": len(set(assignment_counts) & variant_keys),
            "coveredVariantCount": len(set(coverage_counts) & variant_keys),
            "checkedCellCount": checked_cell_count,
            "requiredCellCount": (
                len(variant_keys) * len(required_checks) * len(required_comparisons)
            ),
            "missingAssignments": missing_assignments,
            "duplicateAssignments": duplicate_assignments,
            "unknownAssignments": unknown_assignments,
            "missingCoverage": missing_coverage,
            "duplicateCoverage": duplicate_coverage,
            "unknownCoverage": unknown_coverage,
        },
        "findings": {
            "count": len(findings),
            "byStatus": dict(sorted(status_counts.items())),
            "bySeverity": dict(sorted(severity_counts.items())),
            "conformanceIssueCount": conformance_issue_count,
        },
        "unresolvedCount": len(unresolved) + len(unresolved_cells),
        "errors": errors,
        "warnings": warnings,
    }


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate a Figma component inventory and optional audit result."
    )
    parser.add_argument("inventory", type=Path, help="Path to inventory.json")
    parser.add_argument("audit", nargs="?", type=Path, help="Path to audit.json")
    parser.add_argument(
        "--postflight-inventory",
        type=Path,
        help="Path to a fresh postflight inventory captured after comparison",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        inventory = _read_json(args.inventory)
        if args.audit:
            postflight_inventory = (
                _read_json(args.postflight_inventory)
                if args.postflight_inventory
                else None
            )
            result = validate_audit(
                inventory, _read_json(args.audit), postflight_inventory
            )
        else:
            inventory_result = validate_inventory(inventory)
            result = {
                "valid": not inventory_result["errors"],
                "inventoryFingerprint": inventory_result["fingerprint"],
                "captureFingerprint": inventory_result["captureFingerprint"],
                "captureStartedAt": inventory_result["captureStartedAt"],
                "captureCompletedAt": inventory_result["captureCompletedAt"],
                "actualVariantCount": inventory_result["actualVariantCount"],
                "expectedCombinationCount": inventory_result["expectedCombinationCount"],
                "missingCombinations": inventory_result["missingCombinations"],
                "errors": inventory_result["errors"],
                "warnings": inventory_result["warnings"],
            }
    except ValueError as error:
        print(json.dumps({"valid": False, "error": str(error)}, ensure_ascii=False))
        return 2

    indent = 2 if args.pretty else None
    print(json.dumps(result, ensure_ascii=False, indent=indent, sort_keys=True))
    if args.audit:
        return 0 if result["valid"] and result["complete"] else 1
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
