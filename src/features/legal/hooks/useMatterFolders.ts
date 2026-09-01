import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { MatterFolder } from "../types";

function rowToFolder(row: any): MatterFolder {
  return {
    id: row.id,
    matterId: row.matter_id,
    parentFolderId: row.parent_folder_id || null,
    name: row.name || "",
    position: row.position ?? 0,
  };
}

export function useMatterFolders(matterId: string | null) {
  const [folders, setFolders] = useState<MatterFolder[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!matterId) { setFolders([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("matter_folders")
      .select("*")
      .eq("matter_id", matterId)
      .order("position", { ascending: true });
    if (error) {
      console.error("fetch matter_folders:", error);
      setFolders([]);
    } else {
      setFolders((data || []).map(rowToFolder));
    }
    setLoading(false);
  }, [matterId]);

  useEffect(() => { refetch(); }, [refetch]);

  const createFolder = useCallback(async (name: string, parentFolderId?: string | null) => {
    if (!matterId) return;
    const clean = name.trim();
    if (!clean) return;
    const siblingCount = folders.filter(f => (f.parentFolderId || null) === (parentFolderId || null)).length;
    const { error } = await supabase.from("matter_folders").insert({
      matter_id: matterId,
      parent_folder_id: parentFolderId || null,
      name: clean,
      position: siblingCount,
    });
    if (error) { console.error("createFolder:", error); return; }
    await refetch();
  }, [matterId, folders, refetch]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const { error } = await supabase
      .from("matter_folders")
      .update({ name: clean, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.error("renameFolder:", error); return; }
    await refetch();
  }, [refetch]);

  const reorderFolders = useCallback(async (folderIds: string[], positions: number[]) => {
    const { error } = await supabase.rpc("reorder_folders", {
      p_folder_ids: folderIds,
      p_positions: positions,
    });
    if (error) { console.error("reorderFolders:", error); return; }
    await refetch();
  }, [refetch]);

  const moveFolder = useCallback(async (id: string, newParentFolderId: string | null) => {
    const { error } = await supabase
      .from("matter_folders")
      .update({ parent_folder_id: newParentFolderId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.error("moveFolder:", error); return; }
    await refetch();
  }, [refetch]);

  const deleteFolder = useCallback(async (id: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc("delete_folder_with_password", {
      p_folder_id: id,
      p_password: password,
    });
    if (error) {
      return { ok: false, error: error.message || "Failed to delete folder" };
    }
    await refetch();
    return { ok: true };
  }, [refetch]);

  return { folders, loading, refetch, createFolder, renameFolder, reorderFolders, moveFolder, deleteFolder };
}
