export interface Entity {
  entity: string;
  entity_long: string;
  entity_combined: string;
  entity_description: string | null;
  entity_link: string;
  entity_link_is_un_org: number;
  system_grouping: string;
  category: string;
  un_principal_organ: string | string[];
  un_pillar: string | null;
  is_ceb_member: boolean | null;
  head_of_entity_level: string | null;
  head_of_entity_title_specific: string | null;
  head_of_entity_title_general: string | null;
  head_of_entity_name: string | null;
  head_of_entity_bio: string | null;
  head_of_entity_headshot: string | null;
  global_leadership_team_url: string | null;
  on_display: string;
  foundational_mandate: string | null;
  organizational_chart_link: string | null;
  budget_financial_reporting_link: string | null;
  results_framework_link: string | null;
  strategic_plan_link: string | null;
  annual_reports_link: string | null;
  transparency_portal_link: string | null;
  socials_linkedin: string | null;
  socials_twitter: string | null;
  socials_instagram: string | null;
  entity_news_page: string | null;
  entity_branding_page: string | null;
  entity_data_page: string | null;
  entity_logo_page: string | null;
  entity_wikipedia_page: string | null;
}

export interface Impact {
  id: number;
  entity: string;
  highlight: string;
  impact: string;
}

export interface BudgetEntry {
  entity: string;
  source: string;
  year?: number;
  amount: number;
}

export interface DonorContribution {
  donor: string;
  total: number;
  Assessed?: number;
  "Voluntary earmarked"?: number;
  "Voluntary un-earmarked"?: number;
  Other?: number;
}

export interface EntityRevenue {
  total: number;
  year: number;
  by_type: Record<string, number>;
  by_donor: DonorContribution[];
}
