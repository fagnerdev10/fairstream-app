import { Report } from '../types';
import { supabase } from './supabaseClient';


const REPORTS_KEY = 'fairstream_reports_db';

export const reportService = {
  getAll: async (): Promise<Report[]> => {
    try {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          reason: d.reason,
          videoId: d.video_id,
          videoTitle: d.video_title,
          reporterId: d.reporter_id,
          reporterName: d.reporter_name,
          createdAt: d.created_at,
          status: d.status
        }));
      }
    } catch (e) {
      console.error("Erro ao buscar denúncias do Supabase:", e);
    }
    // Fallback local
    try {
      const data = localStorage.getItem(REPORTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  create: async (reportData: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    const newReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      reason: reportData.reason,
      video_id: reportData.videoId,
      video_title: reportData.videoTitle,
      reporter_id: reportData.reporterId,
      reporter_name: reportData.reporterName,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Supabase
    try {
      const { error } = await supabase.from('reports').insert(newReport);
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao salvar denúncia no Supabase:", e);
    }

    // Local (Backup/Compability)
    try {
      const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
      const localReport: Report = {
        id: newReport.id,
        reason: newReport.reason,
        videoId: newReport.video_id,
        videoTitle: newReport.video_title,
        reporterId: newReport.reporter_id,
        reporterName: newReport.reporter_name,
        createdAt: newReport.created_at,
        status: 'pending'
      };
      reports.unshift(localReport);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    } catch { }

    return true;
  },

  delete: async (id: string) => {
    try {
      await supabase.from('reports').delete().eq('id', id);
    } catch (e) { console.error(e); }

    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    const filtered = reports.filter((r: Report) => r.id !== id);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(filtered));
  },

  markAsReviewed: async (id: string) => {
    try {
      await supabase.from('reports').update({ status: 'reviewed' }).eq('id', id);
    } catch (e) { console.error(e); }

    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    const index = reports.findIndex((r: Report) => r.id === id);
    if (index !== -1) {
      reports[index].status = 'reviewed';
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    }
  }
};