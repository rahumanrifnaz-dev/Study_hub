import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { query } from "../db.js";

export const activityRouter = Router();

// Get latest 15 activities (upload/edit/delete) with user info
activityRouter.get("/latest", authenticate, requireRole(["admin", "super_admin"]), async (_req, res) => {
  // Union uploads, edits, deletes from materials and join with user
  const activities = await query(
    `SELECT a.id, a.type, a.material_id, a.title, a.description, a.section_key, a.week_label, a.file_url, a.timestamp, p.full_name, p.email
     FROM (
       SELECT id, 'upload' as type, id as material_id, title, description, section_key, week_label, file_url, created_at as timestamp, uploader_id as user_id
         FROM materials
       UNION ALL
       SELECT id, 'edit' as type, material_id, title, description, section_key, week_label, file_url, edited_at as timestamp, editor_id as user_id
         FROM material_edits
       UNION ALL
       SELECT id, 'delete' as type, material_id, title, description, section_key, week_label, file_url, deleted_at as timestamp, deleter_id as user_id
         FROM material_deletes
     ) a
     LEFT JOIN profiles p ON a.user_id = p.id
     ORDER BY a.timestamp DESC
     LIMIT 15`
  );
  res.json(activities);
});
