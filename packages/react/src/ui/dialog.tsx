"use client";

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { IconButton } from "@/registry/orca/ui/icon-button";

export type DialogSize = "small" | "large";
export type DialogSeverity = "default" | "alert";

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: unknown) => void;
  /** モーダル（既定 true）。 */
  modal?: boolean;
  children?: ReactNode;
}

const DialogRoot = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open, defaultOpen, onOpenChange, modal = true, children },
  _ref,
) {
  return (
    <BaseDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange as never}
      modal={modal}
    >
      {children}
    </BaseDialog.Root>
  );
});

DialogRoot.displayName = "Dialog";

export type DialogTriggerProps = React.ComponentProps<typeof BaseDialog.Trigger>;

const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger(props, ref) {
    return <BaseDialog.Trigger ref={ref} {...props} />;
  },
);
DialogTrigger.displayName = "Dialog.Trigger";

// Header（Title の pt/pl/pb/pr-48 の逃げ）・Body・Footer は size（small/large）に連動する。
// Content が children から size と Footer の有無を解決し、配下の Title/Body/Footer に context 経由で配る。
interface DialogContentContextValue {
  size: DialogSize;
  hasFooter: boolean;
}

const DialogContentContext = createContext<DialogContentContextValue>({
  size: "small",
  hasFooter: false,
});

// Figma の × アイコンの慣習（Chip の削除アイコン・IconButton stories の CloseIcon）に合わせた24viewBoxの直線2本。
function DialogCloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-full"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Figma 実測（node 9874:10911）: Container 幅上限は small=345px / large=1010px。
// 対応する spacing/sizing token が無い実測値のため、max-width のみ任意値を使う（ユーザー裁定済み例外）。
const CONTAINER_SIZE_CLASS: Record<DialogSize, string> = {
  small: "w-full max-w-[345px]",
  large: "w-full max-w-[1010px]",
};

// Close Affordance の寸法（Figma 実測）: small=40px・アイコン16px、large=56px。
// IconButton の sm/lg 固定正方サイズがそのまま一致する。
const CLOSE_ICON_BUTTON_SIZE: Record<DialogSize, "sm" | "lg"> = {
  small: "sm",
  large: "lg",
};

export interface DialogContentProps {
  size?: DialogSize;
  /** alert は破壊的確認用。role=alertdialog になる。視覚差は持たない。 */
  severity?: DialogSeverity;
  /** Close Affordance のアクセシブルネーム。既定「閉じる」。 */
  closeLabel?: string;
  className?: string;
  children?: ReactNode;
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      size = "small",
      severity = "default",
      closeLabel = "閉じる",
      className,
      children,
    },
    ref,
  ) {
    const hasFooter = Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === DialogFooter,
    );

    return (
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          data-dialog-slot="backdrop"
          className="fixed inset-0 z-40 bg-overlay opacity-100 transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        />
        <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-padding-lg">
          <BaseDialog.Popup
            ref={ref}
            {...(severity === "alert" ? { role: "alertdialog" as const } : {})}
            data-size={size}
            data-severity={severity}
            className={clsx(
              "relative flex max-h-full flex-col overflow-y-auto",
              "bg-surface text-on-surface",
              "rounded-none border-none shadow-level-5",
              "transition-[opacity,transform] duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
              "focus-visible:outline-none",
              CONTAINER_SIZE_CLASS[size],
              className,
            )}
          >
            <BaseDialog.Close
              render={
                <IconButton
                  label={closeLabel}
                  icon={<DialogCloseIcon />}
                  variant="ghost"
                  shape="circle"
                  size={CLOSE_ICON_BUTTON_SIZE[size]}
                  className="absolute right-[var(--sizing-xs)] top-[var(--sizing-xs)]"
                />
              }
            />
            <DialogContentContext.Provider value={{ size, hasFooter }}>
              {children}
            </DialogContentContext.Provider>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    );
  },
);
DialogContent.displayName = "Dialog.Content";

// Title は Header スロット（Title + 右上 Close）を兼ねる。Close は absolute で flow から外れるため、
// Header の内側余白（pt-lg/pl-lg/pb-xs、Close の逃げの pr-48 相当）は flow に残る Title 自身が持つ。
const TITLE_TYPOGRAPHY_CLASS: Record<DialogSize, string> = {
  small: "typography-standard-headline-small-bold",
  large: "typography-standard-headline-large-bold",
};

const DialogTitle = forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof BaseDialog.Title>
>(function DialogTitle({ className, ...rest }, ref) {
  const { size } = useContext(DialogContentContext);
  return (
    <BaseDialog.Title
      ref={ref}
      className={clsx(
        // Header 右 padding 48px に一致する spacing token が無いため、実在する sizing primitive
        // --sizing-6xl（48px）を直接参照する（IconButton の container サイズ指定と同じ書き方）。
        "pt-padding-lg pl-padding-lg pb-padding-xs pr-[var(--sizing-6xl)]",
        "text-primary",
        TITLE_TYPOGRAPHY_CLASS[size],
        className,
      )}
      {...rest}
    />
  );
});
DialogTitle.displayName = "Dialog.Title";

export type DialogCloseProps = React.ComponentProps<typeof BaseDialog.Close>;

const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose(props, ref) {
    return <BaseDialog.Close ref={ref} {...props} />;
  },
);
DialogClose.displayName = "Dialog.Close";

// Body は自由スロット。hasButton=false（Footer なし）のときだけ下端の余白が広がる。
const DialogBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DialogBody({ className, ...rest }, ref) {
    const { hasFooter } = useContext(DialogContentContext);
    return (
      <div
        {...rest}
        ref={ref}
        data-dialog-slot="body"
        className={clsx(
          "px-padding-lg pt-padding-xs",
          hasFooter ? "pb-padding-xs" : "pb-padding-lg",
          className,
        )}
      />
    );
  },
);
DialogBody.displayName = "Dialog.Body";

// Footer のレイアウトは size に連動する。
// small: 右寄せ横並び。large: 中央寄せ縦積みの等幅（filled/outlined の順序は呼び出し側の children 順に委ねる）。
// large の子の幅は Figma 実測 592px = 内容幅 962px（1010 − padding 48）の 61.5% → 60% に丸めて
// 割合で追従させる（min-w-fit でラベルが折れる幅までは縮まない）。固定 592px か割合かはデザイナー確認待ち。
const FOOTER_LAYOUT_CLASS: Record<DialogSize, string> = {
  small: "flex-row flex-wrap items-center justify-end px-padding-lg pt-padding-xs pb-padding-lg",
  large: "flex-col items-center p-padding-lg [&>*]:w-[60%] [&>*]:min-w-fit [&>*]:max-w-full",
};

const DialogFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...rest }, ref) {
  const { size } = useContext(DialogContentContext);
  return (
    <div
      {...rest}
      ref={ref}
      data-dialog-slot="footer"
      data-size={size}
      className={clsx("flex gap-margin-lg", FOOTER_LAYOUT_CLASS[size], className)}
    />
  );
});
DialogFooter.displayName = "Dialog.Footer";

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Body: DialogBody,
  Close: DialogClose,
  Footer: DialogFooter,
});
