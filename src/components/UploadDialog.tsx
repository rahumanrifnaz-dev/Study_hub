import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabaseClient } from "../integrations/supabase/client";

interface UploadDialogProps {
  subjectId: string;
  sectionKey: string;
  onUploaded?: () => void;
  mode?: "create" | "edit";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialWeekLabel?: string;
  initialVideoLink?: string;
  editingId?: string;
  existingFileName?: string;
  existingStoragePath?: string;
}

const UploadDialog = ({
  subjectId,
  sectionKey,
  onUploaded,
  mode = "create",
  open,
  onOpenChange,
  initialWeekLabel = "",
  initialVideoLink = "",
  editingId,
  existingFileName,
  existingStoragePath,
}: UploadDialogProps) => {
  const showKuppiLink = sectionKey === "kuppi";
  const [weekLabel, setWeekLabel] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const moduleConfig =
    subjectId === "cs2833"
      ? {
          moduleName: "Modular Software Development",
          bucketName: "msd-module",
          tableName: "msd_uploads",
        }
      : subjectId === "ee2024"
      ? {
          moduleName: "Electrical Machines in Power Systems",
          bucketName: "ee2024-module",
          tableName: "ee2024_uploads",
        }
      : subjectId === "ee2044"
      ? {
          moduleName: "Electrical Measurements and Instrumentation",
          bucketName: "ee2044-module",
          tableName: "ee2044_uploads",
        }
      : subjectId === "ee2054"
      ? {
          moduleName: "Control Systems",
          bucketName: "ee2054-module",
          tableName: "ee2054_uploads",
        }
      : subjectId === "ee3074"
      ? {
          moduleName: "Electrical Installations",
          bucketName: "ee3074-module",
          tableName: "ee3074_uploads",
        }
      : subjectId === "ma3014"
      ? {
          moduleName: "Applied Statistics",
          bucketName: "ma3014-module",
          tableName: "ma3014_uploads",
        }
      : subjectId === "ma3024"
      ? {
          moduleName: "Numerical Methods",
          bucketName: "ma3024-module",
          tableName: "ma3024_uploads",
        }
      : subjectId === "cs2023"
      ? {
          moduleName: "Data Structures and Algorithms",
          bucketName: "cs2023-module",
          tableName: "cs2023_uploads",
        }
      : subjectId === "ma2034"
      ? {
          moduleName: "Linear Algebra",
          bucketName: "ma2034-module",
          tableName: "ma2034_uploads",
        }
      : null;
  const sectionNameMap: Record<string, string> = {
    lecture_notes: "Lecture Notes",
    lab_sheets: "Lab Sheets",
    tutorials: "Tutorials",
    kuppi: "Kuppi Videos & Notes",
    short_notes: "Short Notes",
  };

  const isEdit = mode === "edit";
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  useEffect(() => {
    if (isEdit) {
      setWeekLabel(initialWeekLabel ?? "");
      setVideoLink(initialVideoLink ?? "");
    }
  }, [isEdit, initialWeekLabel, initialVideoLink, open]);

  const saveUpload = async () => {
    if (!moduleConfig) {
      return;
    }
    if (!file && !videoLink && !isEdit) {
      return;
    }
    setSaving(true);
    try {
      let filePath = "";
      const { moduleName, bucketName, tableName } = moduleConfig;
      let finalStoragePath = existingStoragePath ?? "";
      if (file) {
        const safeName = file.name.replace(/\s+/g, "-");
        filePath = `${sectionKey}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabaseClient
          .storage
          .from(bucketName)
          .upload(filePath, file, { upsert: true });
        if (uploadError) {
          throw uploadError;
        }
        if (existingStoragePath) {
          const { error: removeError } = await supabaseClient.storage
            .from(bucketName)
            .remove([existingStoragePath]);
          if (removeError && removeError.message !== "Object not found") {
            throw removeError;
          }
        }
        finalStoragePath = filePath;
      }

      const payload = {
        module_name: moduleName,
        section_name: sectionNameMap[sectionKey] ?? sectionKey,
        subsection_name: file?.name ?? (isEdit ? existingFileName ?? "" : "Kuppi Video"),
        week_label: weekLabel || null,
        bucket_name: bucketName,
        file_path: isEdit ? finalStoragePath : filePath,
        video_link: videoLink || null,
      };

      if (isEdit && editingId) {
        // Use Supabase update and set uploaded_at to now()
        const { error } = await supabaseClient
          .from(tableName)
          .update({ ...payload, uploaded_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabaseClient.from(tableName).insert(payload);
        if (error) {
          throw error;
        }
      }

      setWeekLabel("");
      setVideoLink("");
      setFile(null);
      setFileError(null);
      onUploaded?.();
      if (handleOpenChange) {
        handleOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {mode === "create" && (
        <DialogTrigger asChild>
          <Button variant="default">Upload</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Material" : "Upload Material"}</DialogTitle>
          <DialogDescription>
            Admin uploads are stored with RLS-ready metadata for subject {subjectId}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3">
          <div className="flex items-center gap-2 bg-blue-50/10 rounded p-2 mb-1">
            <span role="img" aria-label="Share">📤</span>
            <span className="text-xs text-blue-300">
              Tip: On mobile, use <b>Share note</b> in Samsung Notes and select your browser to upload directly—no need to save the file locally!
            </span>
          </div>
          <input
            className="btn-secondary text-left"
            placeholder="Title"
            value={weekLabel}
            onChange={(event) => setWeekLabel(event.target.value)}
          />
          {showKuppiLink && (
            <input
              className="btn-secondary text-left"
              placeholder="Kuppi video link (optional)"
              value={videoLink}
              onChange={(event) => setVideoLink(event.target.value)}
            />
          )}
          {isEdit && existingFileName && (
            <div className="text-xs text-white/60">Current file: {existingFileName}</div>
          )}
          <input
            type="file"
            className="btn-secondary text-left"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (selected && selected.size > 30 * 1024 * 1024) {
                setFile(null);
                setFileError("File size must be 30 MB or smaller.");
                return;
              }
              setFileError(null);
              setFile(selected);
            }}
          />
          <div className="text-xs text-white/60">Recommended: PDF. Other documents are also accepted.</div>
          {fileError && <div className="text-xs text-rose-200">{fileError}</div>}
          <input type="hidden" value={sectionKey} />
          <Button type="button" onClick={saveUpload} disabled={saving}>
            {saving ? "Saving..." : "Save Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
