#!/usr/bin/env python3
"""Unit tests for validate_audit.py."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from datetime import datetime, timedelta

from validate_audit import (
    BASE_REQUIRED_CHECKS,
    canonical_variant_key,
    inventory_fingerprint,
    validate_audit,
    validate_inventory,
)


def offset_timestamp(value: str, seconds: int) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return (parsed + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def make_paint(value: str = "black") -> dict:
    rgba_by_value = {
        "black": {"r": 0, "g": 0, "b": 0, "a": 1},
        "white": {"r": 1, "g": 1, "b": 1, "a": 1},
        "transparent": {"r": 0, "g": 0, "b": 0, "a": 0},
    }
    return {
        "type": "SOLID",
        "visible": True,
        "opacity": 1,
        "rgba": rgba_by_value[value],
        "variableId": None,
        "resolved": value,
        "data": {"blendMode": "NORMAL"},
    }


def make_snapshot(fill: str = "transparent") -> dict:
    return {
        "container": {
            "layoutMode": "HORIZONTAL",
            "primaryAxisSizingMode": "AUTO",
            "counterAxisSizingMode": "FIXED",
            "width": 100,
            "height": 40,
            "minWidth": None,
            "maxWidth": None,
            "minHeight": 40,
            "maxHeight": None,
            "paddingTop": 8,
            "paddingRight": 16,
            "paddingBottom": 8,
            "paddingLeft": 16,
            "itemSpacing": 4,
            "cornerRadius": 4,
            "fills": [make_paint(fill)],
            "strokes": [],
            "strokeWeight": 0,
            "effects": [],
            "opacity": 1,
        },
        "label": {
            "present": True,
            "text": "Label",
            "fontFamily": "Noto Sans JP",
            "fontStyle": "Regular",
            "fontSize": 12,
            "lineHeight": {"unit": "PIXELS", "value": 12},
            "letterSpacing": {"unit": "PIXELS", "value": 0},
            "fills": [make_paint("black")],
        },
        "icons": [],
        "componentProperties": {},
    }


def make_raw_capture_entry(
    part_id: str, payload: dict, captured_at: str
) -> dict:
    payload = copy.deepcopy(payload)
    payload["schemaVersion"] = 1
    payload["partId"] = part_id
    payload["capturedAt"] = captured_at
    payload["returnedCount"] = len(payload["variants"])
    payload["endMarker"] = (
        f"FIGMA_AUDIT_COMPLETE:{part_id}:{payload['returnedCount']}"
    )
    raw_payload = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return {
        "id": part_id,
        "rawPayload": raw_payload,
        "payloadFingerprint": "sha256:"
        + hashlib.sha256(raw_payload.encode("utf-8")).hexdigest(),
    }


def replace_raw_capture_payload(entry: dict, payload: dict) -> None:
    raw_payload = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    entry["rawPayload"] = raw_payload
    entry["payloadFingerprint"] = (
        "sha256:" + hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()
    )


def make_capture(
    component: dict,
    axes: dict,
    component_options: dict,
    variants: list[dict],
    variables: dict,
) -> dict:
    inventory_entry = make_raw_capture_entry(
        "inventory",
        {
            "component": {
                "name": component["name"],
                "fileKey": component["fileKey"],
                "nodeId": component["nodeId"],
                "componentChildCount": len(variants),
            },
            "variantAxes": axes,
            "componentOptions": component_options,
            "variants": [
                {
                    "key": variant["key"],
                    "nodeId": variant["nodeId"],
                    "properties": variant["properties"],
                }
                for variant in variants
            ],
        },
        component["capturedAt"],
    )
    snapshot_entry = make_raw_capture_entry(
        "snapshot-1",
        {
            "component": {
                "fileKey": component["fileKey"],
                "nodeId": component["nodeId"],
            },
            "requestedVariantKeys": [variant["key"] for variant in variants],
            "expectedCount": len(variants),
            "variants": [
                {
                    "key": variant["key"],
                    "nodeId": variant["nodeId"],
                    "snapshot": variant["snapshot"],
                }
                for variant in variants
            ],
            "variables": variables,
        },
        offset_timestamp(component["capturedAt"], 1),
    )
    return {
        "complete": True,
        "truncated": False,
        "inventory": inventory_entry,
        "parts": [snapshot_entry],
    }


def make_postflight_inventory(inventory: dict) -> dict:
    postflight = copy.deepcopy(inventory)
    postflight["component"]["capturedAt"] = offset_timestamp(
        inventory["component"]["capturedAt"], 60
    )
    postflight["capture"] = make_capture(
        postflight["component"],
        postflight["variantAxes"],
        postflight["componentOptions"],
        postflight["variants"],
        postflight["variables"],
    )
    return postflight


def make_inventory() -> dict:
    component = {
        "name": "Sample",
        "fileKey": "sample-file",
        "nodeId": "1:1",
        "capturedAt": "2026-08-04T00:00:00Z",
    }
    axes = {"Type": ["Primary", "Ghost"]}
    component_options: dict = {}
    variants = [
        {
            "key": "Type=Primary",
            "nodeId": "1:2",
            "properties": {"Type": "Primary"},
            "snapshot": make_snapshot("black"),
        },
        {
            "key": "Type=Ghost",
            "nodeId": "1:3",
            "properties": {"Type": "Ghost"},
            "snapshot": make_snapshot("transparent"),
        },
    ]
    variables: dict = {}
    return {
        "schemaVersion": 1,
        "component": component,
        "variantAxes": axes,
        "requireCartesianProduct": True,
        "requiredChecks": sorted(BASE_REQUIRED_CHECKS),
        "requiredComparisons": [
            "figma_vs_design",
            "figma_vs_implementation",
            "design_vs_implementation",
        ],
        "componentOptions": component_options,
        "capture": make_capture(
            component, axes, component_options, variants, variables
        ),
        "variants": variants,
        "variables": variables,
    }


def make_audit(inventory: dict) -> dict:
    def matching_checks() -> dict:
        return {
            check: {
                "figma_vs_design": "match",
                "figma_vs_implementation": "match",
                "design_vs_implementation": "match",
            }
            for check in inventory["requiredChecks"]
        }

    primary_checks = matching_checks()
    primary_checks["container.background"] = {
        "figma_vs_design": "not-asserted",
        "figma_vs_implementation": "match",
        "design_vs_implementation": "not-asserted",
    }
    ghost_checks = matching_checks()
    ghost_checks["container.background"] = {
        "figma_vs_design": "not-asserted",
        "figma_vs_implementation": "mismatch",
        "design_vs_implementation": "not-asserted",
    }
    return {
        "schemaVersion": 1,
        "inventoryFingerprint": inventory_fingerprint(inventory),
        "postflightInventoryFingerprint": inventory_fingerprint(inventory),
        "assignments": [
            {
                "workerId": "worker-1",
                "variantKeys": ["Type=Ghost", "Type=Primary"],
                "inventoryFingerprint": inventory_fingerprint(inventory),
            }
        ],
        "coverage": [
            {
                "variantKey": "Type=Primary",
                "workerId": "worker-1",
                "checks": primary_checks,
            },
            {
                "variantKey": "Type=Ghost",
                "workerId": "worker-1",
                "checks": ghost_checks,
            },
        ],
        "findings": [
            {
                "id": "primary-design-not-asserted",
                "variantKeys": ["Type=Primary", "Type=Ghost"],
                "check": "container.background",
                "comparison": "figma_vs_design",
                "property": "container.fill.base",
                "status": "not-asserted",
                "kind": "undocumented-in-spec",
                "severity": "info",
                "confidence": "high",
                "summary": "設計書は具体色を規定しない",
                "evidence": [
                    {
                        "source": "design",
                        "locator": "Sample.md:10",
                        "kind": "asserted",
                        "value": None,
                    }
                ],
            },
            {
                "id": "implementation-design-not-asserted",
                "variantKeys": ["Type=Primary", "Type=Ghost"],
                "check": "container.background",
                "comparison": "design_vs_implementation",
                "property": "container.fill.base",
                "status": "not-asserted",
                "kind": "undocumented-in-spec",
                "severity": "info",
                "confidence": "high",
                "summary": "設計書は実装の具体色を規定しない",
                "evidence": [
                    {
                        "source": "design",
                        "locator": "Sample.md:10",
                        "kind": "asserted",
                        "value": None,
                    }
                ],
            },
            {
                "id": "ghost-background",
                "variantKeys": ["Type=Ghost"],
                "check": "container.background",
                "comparison": "figma_vs_implementation",
                "property": "container.fill.base",
                "status": "mismatch",
                "kind": "value-mismatch",
                "severity": "medium",
                "confidence": "high",
                "summary": "背景が異なる",
                "evidence": [
                    {
                        "source": "figma",
                        "locator": "sample-file#1:3",
                        "kind": "observed",
                        "value": "transparent",
                    },
                    {
                        "source": "implementation",
                        "locator": "sample.tsx:10",
                        "kind": "observed",
                        "value": "black",
                    },
                ],
            }
        ],
        "unresolved": [],
    }


class ValidateAuditTests(unittest.TestCase):
    def test_complete_audit_with_difference_is_valid_but_not_conformant(self) -> None:
        inventory = make_inventory()
        result = validate_audit(
            inventory, make_audit(inventory), make_postflight_inventory(inventory)
        )
        self.assertTrue(result["valid"])
        self.assertTrue(result["complete"])
        self.assertFalse(result["conformant"])
        self.assertEqual(result["coverage"]["checkedCellCount"], 102)

    def test_not_asserted_alone_does_not_make_sources_nonconformant(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        audit["coverage"][1]["checks"]["container.background"][
            "figma_vs_implementation"
        ] = "match"
        audit["findings"] = [
            finding
            for finding in audit["findings"]
            if finding["id"] != "ghost-background"
        ]
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertTrue(result["complete"])
        self.assertTrue(result["conformant"])

    def test_missing_and_duplicate_coverage_fail(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        audit["coverage"] = [audit["coverage"][0], copy.deepcopy(audit["coverage"][0])]
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["valid"])
        self.assertFalse(result["complete"])
        self.assertEqual(result["coverage"]["duplicateCoverage"], ["Type=Primary"])
        self.assertEqual(result["coverage"]["missingCoverage"], ["Type=Ghost"])

    def test_snapshot_change_invalidates_fingerprint(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        inventory["variants"][0]["snapshot"]["container"]["fills"] = [
            make_paint("white")
        ]
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["valid"])
        self.assertTrue(any("inventoryFingerprint" in error for error in result["errors"]))

    def test_non_cartesian_inventory_reports_error_when_required(self) -> None:
        inventory = make_inventory()
        inventory["variants"].pop()
        result = validate_inventory(inventory)
        self.assertTrue(any("missing Cartesian" in error for error in result["errors"]))

    def test_truncated_snapshot_is_invalid(self) -> None:
        inventory = make_inventory()
        inventory["capture"]["truncated"] = True
        result = validate_inventory(inventory)
        self.assertTrue(any("capture.truncated" in error for error in result["errors"]))

    def test_missing_transport_end_marker_is_invalid(self) -> None:
        inventory = make_inventory()
        entry = inventory["capture"]["parts"][0]
        payload = json.loads(entry["rawPayload"])
        payload["endMarker"] = "truncated"
        replace_raw_capture_payload(entry, payload)
        result = validate_inventory(inventory)
        self.assertTrue(any("endMarker" in error for error in result["errors"]))

    def test_raw_payload_fingerprint_mismatch_is_invalid(self) -> None:
        inventory = make_inventory()
        inventory["capture"]["parts"][0]["payloadFingerprint"] = "sha256:stale"
        result = validate_inventory(inventory)
        self.assertTrue(
            any("does not match rawPayload SHA-256" in error for error in result["errors"])
        )

    def test_transport_truncation_marker_is_invalid(self) -> None:
        inventory = make_inventory()
        entry = inventory["capture"]["parts"][0]
        entry["rawPayload"] += "\n// truncated to 20kb"
        entry["payloadFingerprint"] = (
            "sha256:"
            + hashlib.sha256(entry["rawPayload"].encode("utf-8")).hexdigest()
        )
        result = validate_inventory(inventory)
        self.assertTrue(
            any("transport truncation marker" in error for error in result["errors"])
        )

    def test_raw_inventory_cannot_omit_a_variant(self) -> None:
        inventory = make_inventory()
        entry = inventory["capture"]["inventory"]
        payload = json.loads(entry["rawPayload"])
        payload["variants"].pop()
        payload["component"]["componentChildCount"] = 1
        payload["returnedCount"] = 1
        payload["endMarker"] = "FIGMA_AUDIT_COMPLETE:inventory:1"
        replace_raw_capture_payload(entry, payload)
        result = validate_inventory(inventory)
        self.assertTrue(
            any("raw capture inventory is missing variant keys" in error for error in result["errors"])
        )

    def test_raw_inventory_file_key_must_match(self) -> None:
        inventory = make_inventory()
        entry = inventory["capture"]["inventory"]
        payload = json.loads(entry["rawPayload"])
        payload["component"]["fileKey"] = "different-file"
        replace_raw_capture_payload(entry, payload)
        result = validate_inventory(inventory)
        self.assertTrue(any("fileKey does not match" in error for error in result["errors"]))

    def test_snapshot_cannot_be_an_empty_object(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"] = {}
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(
            any("missing required visual fields" in error for error in result["errors"])
        )

    def test_snapshot_cannot_be_a_null_visual_shell(self) -> None:
        inventory = make_inventory()
        snapshot = make_snapshot()
        for field in (
            "layoutMode",
            "primaryAxisSizingMode",
            "counterAxisSizingMode",
            "width",
            "height",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
            "itemSpacing",
            "cornerRadius",
            "strokeWeight",
            "opacity",
        ):
            snapshot["container"][field] = None
        inventory["variants"][0]["snapshot"] = snapshot
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("layoutMode" in error for error in result["errors"]))
        self.assertTrue(any("cornerRadius" in error for error in result["errors"]))

    def test_paint_elements_require_normalized_structure(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["container"]["fills"] = ["black"]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("container.fills[0]" in error for error in result["errors"]))

    def test_unknown_paint_type_is_rejected(self) -> None:
        inventory = make_inventory()
        paint = make_paint()
        paint["type"] = "UNKNOWN"
        paint["rgba"] = None
        inventory["variants"][0]["snapshot"]["container"]["fills"] = [paint]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any(".type must be one of" in error for error in result["errors"]))

    def test_non_string_paint_type_is_structurally_rejected(self) -> None:
        inventory = make_inventory()
        paint = make_paint()
        paint["type"] = ["SOLID"]
        inventory["variants"][0]["snapshot"]["container"]["fills"] = [paint]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any(".type must be one of" in error for error in result["errors"]))

    def test_gradient_requires_type_specific_data(self) -> None:
        inventory = make_inventory()
        paint = make_paint()
        paint.update(
            {
                "type": "GRADIENT_LINEAR",
                "rgba": None,
                "resolved": {"type": "GRADIENT_LINEAR"},
            }
        )
        inventory["variants"][0]["snapshot"]["container"]["fills"] = [paint]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("gradientStops" in error for error in result["errors"]))

    def test_effect_elements_require_normalized_structure(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["container"]["effects"] = [{}]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("container.effects[0]" in error for error in result["errors"]))

    def test_shadow_cannot_be_a_null_type_specific_shell(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["container"]["effects"] = [
            {
                "type": "DROP_SHADOW",
                "visible": True,
                "radius": None,
                "spread": None,
                "offset": None,
                "color": None,
                "variableId": None,
                "data": {},
            }
        ]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("radius must be" in error for error in result["errors"]))
        self.assertTrue(any("blendMode" in error for error in result["errors"]))

    def test_non_string_effect_type_is_structurally_rejected(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["container"]["effects"] = [
            {
                "type": {"kind": "DROP_SHADOW"},
                "visible": True,
                "radius": None,
                "spread": None,
                "offset": None,
                "color": None,
                "variableId": None,
                "data": {},
            }
        ]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any(".type must be one of" in error for error in result["errors"]))

    def test_valid_gradient_and_shadow_are_accepted(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["container"]["fills"] = [
            {
                "type": "GRADIENT_LINEAR",
                "visible": True,
                "opacity": 1,
                "rgba": None,
                "variableId": None,
                "resolved": {"kind": "gradient", "stopCount": 2},
                "data": {
                    "blendMode": "NORMAL",
                    "gradientTransform": [[1, 0, 0], [0, 1, 0]],
                    "gradientStops": [
                        {
                            "position": 0,
                            "color": {"r": 0, "g": 0, "b": 0, "a": 1},
                            "variableId": None,
                        },
                        {
                            "position": 1,
                            "color": {"r": 1, "g": 1, "b": 1, "a": 1},
                            "variableId": None,
                        },
                    ],
                },
            }
        ]
        inventory["variants"][0]["snapshot"]["container"]["effects"] = [
            {
                "type": "DROP_SHADOW",
                "visible": True,
                "radius": 4,
                "spread": 0,
                "offset": {"x": 0, "y": 2},
                "color": {"r": 0, "g": 0, "b": 0, "a": 0.25},
                "variableId": None,
                "data": {
                    "blendMode": "NORMAL",
                    "showShadowBehindNode": False,
                },
            }
        ]
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertEqual(result["errors"], [])

    def test_present_label_requires_typography_values(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["label"]["fontFamily"] = None
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("fontFamily" in error for error in result["errors"]))

    def test_component_property_values_are_typed(self) -> None:
        inventory = make_inventory()
        inventory["variants"][0]["snapshot"]["componentProperties"] = {
            "Show Icon#1:1": {"type": "BOOLEAN", "value": "true"}
        }
        inventory["capture"] = make_capture(
            inventory["component"],
            inventory["variantAxes"],
            inventory["componentOptions"],
            inventory["variants"],
            inventory["variables"],
        )
        result = validate_inventory(inventory)
        self.assertTrue(any("value must be boolean" in error for error in result["errors"]))

    def test_invalid_requested_variant_key_type_returns_structured_error(self) -> None:
        inventory = make_inventory()
        entry = inventory["capture"]["parts"][0]
        payload = json.loads(entry["rawPayload"])
        payload["requestedVariantKeys"] = [{"not": "a string"}]
        payload["expectedCount"] = 1
        replace_raw_capture_payload(entry, payload)
        result = validate_inventory(inventory)
        self.assertTrue(
            any("requestedVariantKeys must contain only" in error for error in result["errors"])
        )

    def test_missing_source_comparison_is_invalid(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        del audit["coverage"][0]["checks"]["container.background"][
            "design_vs_implementation"
        ]
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["valid"])
        self.assertTrue(any("missing required comparisons" in error for error in result["errors"]))

    def test_inventory_cannot_remove_a_baseline_check(self) -> None:
        inventory = make_inventory()
        inventory["requiredChecks"].remove("icon.size")
        result = validate_inventory(inventory)
        self.assertTrue(any("missing baseline checks" in error for error in result["errors"]))

    def test_inventory_cannot_remove_a_source_pair(self) -> None:
        inventory = make_inventory()
        inventory["requiredComparisons"].remove("design_vs_implementation")
        result = validate_inventory(inventory)
        self.assertTrue(any("missing source pairs" in error for error in result["errors"]))

    def test_mismatch_requires_both_endpoint_sources(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        mismatch = next(
            finding
            for finding in audit["findings"]
            if finding["id"] == "ghost-background"
        )
        mismatch["evidence"][1]["source"] = "design"
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["valid"])
        self.assertTrue(any("missing endpoint evidence" in error for error in result["errors"]))

    def test_postflight_fingerprint_is_required(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        audit["postflightInventoryFingerprint"] = "sha256:stale"
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["complete"])
        self.assertTrue(any("postflightInventoryFingerprint" in error for error in result["errors"]))

    def test_postflight_inventory_artifact_is_required(self) -> None:
        inventory = make_inventory()
        result = validate_audit(inventory, make_audit(inventory))
        self.assertFalse(result["complete"])
        self.assertTrue(any("postflight inventory is required" in error for error in result["errors"]))

    def test_copied_preflight_cannot_serve_as_postflight(self) -> None:
        inventory = make_inventory()
        result = validate_audit(inventory, make_audit(inventory), copy.deepcopy(inventory))
        self.assertFalse(result["complete"])
        self.assertTrue(
            any("fresh MCP read is required" in error for error in result["errors"])
        )

    def test_changed_postflight_state_is_rejected(self) -> None:
        inventory = make_inventory()
        postflight = make_postflight_inventory(inventory)
        postflight["variants"][0]["snapshot"]["container"]["fills"] = [
            make_paint("white")
        ]
        postflight["capture"] = make_capture(
            postflight["component"],
            postflight["variantAxes"],
            postflight["componentOptions"],
            postflight["variants"],
            postflight["variables"],
        )
        result = validate_audit(inventory, make_audit(inventory), postflight)
        self.assertFalse(result["complete"])
        self.assertTrue(any("Figma state changed" in error for error in result["errors"]))

    def test_postflight_chronology_must_follow_preflight(self) -> None:
        inventory = make_inventory()
        postflight = copy.deepcopy(inventory)
        postflight["component"]["capturedAt"] = offset_timestamp(
            inventory["component"]["capturedAt"], -60
        )
        postflight["capture"] = make_capture(
            postflight["component"],
            postflight["variantAxes"],
            postflight["componentOptions"],
            postflight["variants"],
            postflight["variables"],
        )
        result = validate_audit(inventory, make_audit(inventory), postflight)
        self.assertFalse(result["complete"])
        self.assertTrue(any("postflight capture must start" in error for error in result["errors"]))

    def test_variable_alias_cycle_is_invalid(self) -> None:
        inventory = make_inventory()
        inventory["variables"] = {
            "VariableID:1": {
                "name": "A",
                "modes": {"Light": {"alias": "VariableID:2"}},
            },
            "VariableID:2": {
                "name": "B",
                "modes": {"Light": {"alias": "VariableID:1"}},
            },
        }
        result = validate_inventory(inventory)
        self.assertTrue(any("alias cycles" in error for error in result["errors"]))

    def test_unknown_variant_is_rejected(self) -> None:
        inventory = make_inventory()
        audit = make_audit(inventory)
        audit["assignments"][0]["variantKeys"].append("Type=Unknown")
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertFalse(result["valid"])
        self.assertEqual(result["coverage"]["unknownAssignments"], ["Type=Unknown"])

    def test_button_shaped_45_variant_matrix_is_fully_covered(self) -> None:
        axes = {
            "Type": ["Primary", "Secondary", "Ghost"],
            "Size": ["Small", "Medium", "Large"],
            "State": ["Enabled", "Hover", "Active", "Focused", "Disabled"],
        }
        variants = []
        node_number = 100
        for button_type in axes["Type"]:
            for size in axes["Size"]:
                for state in axes["State"]:
                    properties = {"Type": button_type, "Size": size, "State": state}
                    variants.append(
                        {
                            "key": canonical_variant_key(properties),
                            "nodeId": f"1:{node_number}",
                            "properties": properties,
                            "snapshot": make_snapshot(),
                        }
                    )
                    node_number += 1
        inventory = {
            "schemaVersion": 1,
            "component": {
                "name": "Button",
                "fileKey": "sample",
                "nodeId": "1:1",
                "capturedAt": "2026-08-04T00:00:00Z",
            },
            "variantAxes": axes,
            "requireCartesianProduct": True,
            "requiredChecks": sorted(BASE_REQUIRED_CHECKS),
            "requiredComparisons": [
                "figma_vs_design",
                "figma_vs_implementation",
                "design_vs_implementation",
            ],
            "componentOptions": {},
            "variants": variants,
            "variables": {},
        }
        inventory["capture"] = make_capture(
            inventory["component"], axes, {}, variants, {}
        )
        fingerprint = inventory_fingerprint(inventory)
        keys = sorted(variant["key"] for variant in variants)
        assignments = []
        coverage = []
        for worker_index in range(3):
            worker_id = f"worker-{worker_index + 1}"
            worker_keys = keys[worker_index * 15 : (worker_index + 1) * 15]
            assignments.append(
                {
                    "workerId": worker_id,
                    "variantKeys": worker_keys,
                    "inventoryFingerprint": fingerprint,
                }
            )
            coverage.extend(
                {
                    "variantKey": key,
                    "workerId": worker_id,
                    "checks": {
                        check: {
                            "figma_vs_design": "match",
                            "figma_vs_implementation": "match",
                            "design_vs_implementation": "match",
                        }
                        for check in sorted(BASE_REQUIRED_CHECKS)
                    },
                }
                for key in worker_keys
            )
        audit = {
            "schemaVersion": 1,
            "inventoryFingerprint": fingerprint,
            "postflightInventoryFingerprint": fingerprint,
            "assignments": assignments,
            "coverage": coverage,
            "findings": [],
            "unresolved": [],
        }
        result = validate_audit(inventory, audit, make_postflight_inventory(inventory))
        self.assertTrue(result["valid"])
        self.assertTrue(result["complete"])
        self.assertTrue(result["conformant"])
        self.assertEqual(result["inventory"]["actualVariantCount"], 45)
        self.assertEqual(result["coverage"]["checkedCellCount"], 2295)

    def test_captured_at_does_not_change_fingerprint(self) -> None:
        inventory = make_inventory()
        changed = make_postflight_inventory(inventory)
        self.assertEqual(inventory_fingerprint(inventory), inventory_fingerprint(changed))


if __name__ == "__main__":
    unittest.main()
