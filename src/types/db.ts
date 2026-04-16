export type Role = 'worker' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export interface SiteTask {
  id: string;
  label: string;
  source_url: string;
  instructions: string | null;
  territory: { name: string; code: string };
  baseline: {
    latest_article_title: string | null;
    latest_article_date: string | null;
    latest_article_url: string | null;
  };
}

export interface ArticleInput {
  title: string;
  date: string;
  url: string;
  articleText?: string;
}

export interface SubmissionRow {
  id: string;
  site_id: string;
  submitted_article_title: string | null;
  submitted_article_date: string | null;
  submitted_article_url: string | null;
  article_text: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
