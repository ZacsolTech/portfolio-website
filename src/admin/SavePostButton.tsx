"use client";

import React, { useRef } from "react";
import {
  FormSubmit,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormModified,
  useHotkey,
  useOperation,
  useTranslation,
} from "@payloadcms/ui";

export function SavePostButton({ label: labelProp }: { label?: string }) {
  const { uploadStatus } = useDocumentInfo();
  const { t } = useTranslation();
  const { submit } = useForm();
  const modified = useFormModified();
  const label = labelProp || t("general:save");
  const ref = useRef<HTMLButtonElement>(null);
  const editDepth = useEditDepth();
  const operation = useOperation();
  const { config } = useConfig();
  const disabled = (operation === "update" && !modified) || uploadStatus === "uploading";
  const admin = config.routes.admin || "/admin";

  useHotkey(
    {
      cmdCtrlKey: true,
      editDepth,
      keyCodes: ["s"],
    },
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      ref.current?.click();
    },
  );

  const handleSubmit = () => {
    if (uploadStatus === "uploading") return;

    void (async () => {
      let saved = false;
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const res = await origFetch(input, init);
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : String(input);
        const method = (
          init?.method || (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        const created = method === "POST" && res.status === 201 && /\/api\/posts(\?|$)/.test(url);
        const updated =
          (method === "PATCH" || method === "POST") &&
          res.status === 200 &&
          /\/api\/posts\/\d+/.test(url);
        if (created || updated) saved = true;
        return res;
      };
      try {
        await submit();
      } finally {
        window.fetch = origFetch;
      }
      if (saved) {
        window.location.assign(`${admin}/collections/posts`);
      }
    })();
  };

  return (
    <FormSubmit
      buttonId="action-save"
      disabled={disabled}
      onClick={handleSubmit}
      ref={ref}
      size="medium"
      type="button"
    >
      {label}
    </FormSubmit>
  );
}
