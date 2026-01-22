import AppMetrica from "@appmetrica/react-native-analytics";
import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import { getApp } from "@react-native-firebase/app";

type Params = Record<string, any>;

export async function track(event: string, params: Params = {}) {
  // Firebase
  try {
    const analytics = getAnalytics(getApp());
    await logEvent(analytics, event, params);
  } catch (e) {
    console.log("[track] Firebase error", e);
  }

  // AppMetrica
  try {
    AppMetrica.reportEvent(event, params);
  } catch (e) {
    console.log("[track] AppMetrica error", e);
  }

  console.log("[track]", event, params);
}

// ============ Основные события ============

export const trackOpenApp = () => track("open_app");

export const trackCreateInvoice = (params?: { 
  invoice_id?: string; 
  client_name?: string;
  items_count?: number;
  total?: number;
}) => track("create_invoice", params || {});

export const trackAddItem = (params?: { 
  item_index?: number;
}) => track("add_item", params || {});

export const trackRemoveItem = (params?: { 
  item_index?: number;
}) => track("remove_item", params || {});

export const trackEditItem = (params?: { 
  item_index?: number;
  field?: string;
}) => track("edit_item", params || {});

export const trackExportPdf = (params?: { 
  invoice_id?: string;
  invoices_count?: number;
}) => track("export_pdf", params || {});

export const trackShareInvoice = (params?: { 
  invoice_id?: string;
  invoice_number?: string;
}) => track("share_invoice", params || {});

// ============ Монетизация/реклама ============

export const trackAdBannerLoaded = () => track("ad_banner_loaded");

export const trackAdBannerFailed = (params?: { 
  error?: string;
  code?: string;
}) => track("ad_banner_failed", params || {});