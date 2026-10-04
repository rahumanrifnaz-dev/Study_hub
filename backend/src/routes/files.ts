import { Router } from "express";
import multer from "multer";
import type { AuthedRequest } from "../middleware/auth.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { query } from "../db.js";

const upload = multer({ dest: "uploads/" });
export const fileRouter = Router();

fileRouter.get("/subject/:subjectId", authenticate, async (req, res) => {
  const { subjectId } = req.params;
  const files = await query(
    "SELECT id, title, description, section_key, week_label, file_url, created_at FROM materials WHERE subject_id = $1 ORDER BY created_at DESC",
    [subjectId]
  );
  res.json(files);
});

fileRouter.post(
  "/upload",
  authenticate,
  requireRole(["admin", "super_admin"]),
  upload.single("file"),
  async (req, res) => {
    const { title, description, subjectId, sectionKey, weekLabel } = req.body as {
      title: string;
      description: string;
      subjectId: string;
      sectionKey: string;
      weekLabel?: string;
    };

    const fileUrl = `/uploads/${req.file?.filename}`;

    const [material] = await query(
      "INSERT INTO materials (title, description, subject_id, section_key, week_label, file_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, description, subjectId, sectionKey, weekLabel ?? null, fileUrl]
    );

    res.json(material);
  }
);

// Log an edit to a material
fileRouter.post(
  "/edit",
  authenticate,
  requireRole(["admin", "super_admin"]),
  async (req: AuthedRequest, res) => {
    const { materialId, title, description, sectionKey, weekLabel, fileUrl, tableName } = req.body as {
      materialId: string;
      title: string;
      description: string;
      sectionKey: string;
      weekLabel?: string;
      fileUrl: string;
      tableName: string;
    };
    const editorId = req.user!.sub;
    // Log the edit
    const [edit] = await query(
      `INSERT INTO material_edits (material_id, title, description, section_key, week_label, file_url, editor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [materialId, title, description, sectionKey, weekLabel ?? null, fileUrl, editorId]
    );

    // Update the uploaded_at field in the relevant uploads table
    if (tableName) {
      await query(
        `UPDATE ${tableName} SET uploaded_at = now() WHERE id = $1`,
        [materialId]
      );
    }

    res.json(edit);
  }
);

// Log a delete to material_deletes and delete from materials
fileRouter.delete(
  "/:materialId",
  authenticate,
  requireRole(["admin", "super_admin"]),
  async (req: AuthedRequest, res) => {
    const { materialId } = req.params;
    // Get material info before delete
    const [material] = await query(
      "SELECT * FROM materials WHERE id = $1",
      [materialId]
    );
    if (!material) return res.status(404).json({ error: "Material not found" });
    // Log delete
    await query(
      `INSERT INTO material_deletes (material_id, title, description, section_key, week_label, file_url, deleter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        material.id,
        material.title,
        material.description,
        material.section_key,
        material.week_label,
        material.file_url,
        req.user!.sub,
      ]
    );
    // Delete material
    await query("DELETE FROM materials WHERE id = $1", [materialId]);
    res.json({ success: true });
  }
);
