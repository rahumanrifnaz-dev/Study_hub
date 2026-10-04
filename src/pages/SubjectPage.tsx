import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SubjectSection, { MaterialItem } from "../components/SubjectSection";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/auth-context";
import { supabaseClient } from "../integrations/supabase/client";
import UploadDialog from "../components/UploadDialog";

const lectureNotes: MaterialItem[] = [
  {
    id: "lec-1",
    title: "Lecture Note 01",
    description: "Core definitions and overview.",
    fileName: "lecture-01.pdf",
    uploadedAt: "2 days ago",
  },
  {
    id: "lec-2",
    title: "Lecture Note 02",
    description: "Worked examples and key formulas.",
    fileName: "lecture-02.pdf",
    uploadedAt: "5 days ago",
  },
];

const labSheets: MaterialItem[] = [
  {
    id: "lab-1",
    title: "Lab Sheet 01",
    description: "Measurements and instrumentation tasks.",
    fileName: "lab-01.pdf",
    uploadedAt: "1 week ago",
  },
];

const tutorialPapers: MaterialItem[] = [
  {
    id: "tut-1",
    title: "Tutorial 01 + Answers",
    description: "Solved problems and steps.",
    fileName: "tutorial-01.pdf",
    uploadedAt: "3 days ago",
  },
];

const kuppiResources: MaterialItem[] = [
  {
    id: "kuppi-1",
    title: "Kuppi Session 01 (Video Link)",
    description: "Recorded kuppi discussion and notes.",
    fileName: "kuppi-01.pdf",
    linkUrl: "https://example.com/kuppi-session-01",
    uploadedAt: "4 days ago",
  },
];

const shortNotes: MaterialItem[] = [
  {
    id: "short-1",
    title: "Quick Revision Notes",
    description: "Concise summary for exams.",
    fileName: "short-notes.pdf",
    uploadedAt: "6 days ago",
  },
];

const subjectMap: Record<string, { name: string; code: string }> = {
  cs2833: { name: "Modular Software Development", code: "CS2833" },
  ee2024: { name: "Electrical Machines in Power Systems", code: "EE2024" },
  ee2044: { name: "Electrical Measurements and Instrumentation", code: "EE2044" },
  ee2054: { name: "Control Systems", code: "EE2054" },
  ee3074: { name: "Electrical Installations", code: "EE3074" },
  ma3014: { name: "Applied Statistics", code: "MA3014" },
  ma3024: { name: "Numerical Methods", code: "MA3024" },
  cs2023: { name: "Data Structures and Algorithms", code: "CS2023" },
  ma2034: { name: "Linear Algebra", code: "MA2034" },
};

const SubjectPage = () => {
  const { subjectId } = useParams();
  const subject = subjectId ? subjectMap[subjectId] : undefined;
  const [activeSection, setActiveSection] = useState("lecture_notes");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, requestAdmin } = useAuth();
  const [requestStatus, setRequestStatus] = useState<"idle" | "sent" | "error">("idle");
  const [moduleSectionItems, setModuleSectionItems] = useState<Record<string, MaterialItem[]>>({});
  const [moduleLoading, setModuleLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [editingSection, setEditingSection] = useState<string>("lecture_notes");

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

  const loadModuleMaterials = async () => {
    if (!moduleConfig) {
      return;
    }
    setModuleLoading(true);
    const { data, error } = await supabaseClient
      .from(moduleConfig.tableName)
      .select("id, section_name, subsection_name, week_label, file_path, video_link, uploaded_at")
      .eq("module_name", moduleConfig.moduleName)
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      const sectionKeyByName: Record<string, string> = {
        "Lecture Notes": "lecture_notes",
        "Lab Sheets": "lab_sheets",
        "Tutorials": "tutorials",
        "Tutorials / Past Papers + Answers": "tutorials",
        "Kuppi Videos & Notes": "kuppi",
        "Short Notes": "short_notes",
      };

      const grouped: Record<string, MaterialItem[]> = {};
      for (const row of data as Array<{
        id: string;
        section_name: string;
        subsection_name: string | null;
        week_label: string | null;
        file_path: string;
        video_link: string | null;
        uploaded_at: string;
      }>) {
        const sectionKey = sectionKeyByName[row.section_name] ?? "lecture_notes";
        const items = grouped[sectionKey] ?? [];
        const publicUrl = row.file_path
          ? supabaseClient.storage
              .from(moduleConfig.bucketName)
              .getPublicUrl(row.file_path).data.publicUrl
          : "";
        items.push({
          id: row.id,
          title: "",
          description: row.week_label ?? "",
          fileName: row.file_path,
          uploadedAt: new Date(row.uploaded_at).toLocaleDateString(),
          linkUrl: row.video_link ?? publicUrl,
          storagePath: row.file_path,
          videoLink: row.video_link ?? undefined,
        });
        grouped[sectionKey] = items;
      }
      setModuleSectionItems(grouped);
    }
    setModuleLoading(false);
  };

  useEffect(() => {
    loadModuleMaterials();
  }, [subjectId]);

  const handleModuleDelete = async (item: MaterialItem) => {
    if (!moduleConfig) {
      return;
    }
    await supabaseClient.from(moduleConfig.tableName).delete().eq("id", item.id);
    if (item.storagePath) {
      await supabaseClient.storage.from(moduleConfig.bucketName).remove([item.storagePath]);
    }
    loadModuleMaterials();
  };

  const handleModuleEdit = async (item: MaterialItem, sectionKey: string) => {
    if (!moduleConfig) {
      return;
    }
    setEditingItem(item);
    setEditingSection(sectionKey);
    setEditOpen(true);
  };

  const sections = [
    {
      key: "lecture_notes",
      label: "Lecture Notes",
      items: moduleConfig ? moduleSectionItems.lecture_notes ?? [] : lectureNotes,
    },
    {
      key: "lab_sheets",
      label: "Lab Sheets",
      items: moduleConfig ? moduleSectionItems.lab_sheets ?? [] : labSheets,
    },
    {
      key: "tutorials",
      label: "Tutorials / Past Papers + Answers",
      items: moduleConfig ? moduleSectionItems.tutorials ?? [] : tutorialPapers,
    },
    {
      key: "kuppi",
      label: "Kuppi Videos & Notes",
      items: moduleConfig ? moduleSectionItems.kuppi ?? [] : kuppiResources,
    },
    {
      key: "short_notes",
      label: "Short Notes",
      items: moduleConfig ? moduleSectionItems.short_notes ?? [] : shortNotes,
    },
  ];

  const currentSection = sections.find((section) => section.key === activeSection);

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="subject-full">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4 subject-shell">
        <aside
          className={`glass-card p-3 sm:p-4 subject-scroll mobile-sidebar ${
            sidebarOpen ? "mobile-sidebar-open" : ""
          } w-full lg:max-w-xs lg:mx-0`}
        >
          <h2 className="section-title mb-4">Sections</h2>
          <div className="flex flex-col gap-2 text-sm">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => {
                  setActiveSection(section.key);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={
                  activeSection === section.key
                    ? "px-3 py-2 rounded-lg bg-white/15 text-white text-left"
                    : "px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-left"
                }
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>
        <div className="space-y-4 subject-scroll w-full">
          <div className="glass-card p-4 flex items-center justify-between gap-4">
            <button
              type="button"
              className="btn-secondary lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <div>
              <h2 className="text-xl font-semibold">
                {subject?.code ?? subjectId} - {subject?.name ?? "Module"}
              </h2>
              {user && (
                <p className="text-xs text-white/60">Role: {user.role.replace("_", " ")}</p>
              )}
            </div>
            {user?.role === "member" && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await requestAdmin();
                    setRequestStatus("sent");
                  } catch {
                    setRequestStatus("error");
                  }
                }}
              >
                Request Admin Access
              </Button>
            )}
          </div>
          {requestStatus === "sent" && (
            <div className="glass-card p-3 text-sm text-green-200">
              Request sent to Super Admin.
            </div>
          )}
          {requestStatus === "error" && (
            <div className="glass-card p-3 text-sm text-rose-200">
              Request failed. Please try again.
            </div>
          )}
          <SubjectSection
            title={currentSection?.label ?? "Section"}
            items={currentSection?.items ?? []}
            subjectId={subjectId ?? "unknown"}
            sectionKey={currentSection?.key ?? "unknown"}
            onReload={moduleConfig ? loadModuleMaterials : undefined}
            onEdit={moduleConfig ? handleModuleEdit : undefined}
            onDelete={moduleConfig ? handleModuleDelete : undefined}
          />
          {moduleConfig && editingItem && (
            <UploadDialog
              subjectId={subjectId ?? "unknown"}
              sectionKey={editingSection}
              mode="edit"
              open={editOpen}
              onOpenChange={(value: boolean) => {
                if (!value) {
                  setEditingItem(null);
                }
                setEditOpen(value);
              }}
              initialWeekLabel={editingItem.description}
              initialVideoLink={editingItem.videoLink}
              editingId={editingItem.id}
              existingFileName={editingItem.fileName}
              existingStoragePath={editingItem.storagePath}
              onUploaded={loadModuleMaterials}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectPage;
