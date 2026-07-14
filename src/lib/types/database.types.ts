// Hand-written to match supabase/migrations/*.sql (Phase 1).
// Regenerate with `supabase gen types typescript` once the Supabase CLI
// is linked to the project, and this file becomes redundant.

export type UserRole = "rep" | "manager" | "admin";
export type DoctorStatus = "active" | "pending_approval" | "archived";
export type DynamicCategory = "Α" | "Β" | "Γ";
export type PriorityColor = "green" | "orange" | "red";
export type VisitType = "normal" | "joint";
export type VisitStatus = "planned" | "completed" | "cancelled";
export type ProductName = "aknicare" | "closebax" | "terproline" | "rosacure";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          is_active?: boolean;
        };
        Update: Partial<{
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
        }>;
      };
      bricks: {
        Row: {
          code: string;
          name: string | null;
          region: string | null;
          county: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          name?: string | null;
          region?: string | null;
          county?: string | null;
        };
        Update: Partial<{
          name: string | null;
          region: string | null;
          county: string | null;
        }>;
      };
      doctors: {
        Row: {
          id: string;
          full_name_raw: string | null;
          last_name: string;
          first_name: string;
          region: string | null;
          county: string | null;
          brick_code: string | null;
          dynamic_category: DynamicCategory | null;
          budget_2025: number | null;
          budget_2026: number | null;
          disbursed_2025: number | null;
          disbursed_2026: number | null;
          incentive_2025: number | null;
          incentive_2026: number | null;
          priority_color: PriorityColor | null;
          pharmacy_1: string | null;
          pharmacy_2: string | null;
          weekly_rx_aknicare: number | null;
          weekly_rx_closebax: number | null;
          weekly_rx_terproline: number | null;
          weekly_rx_rosacure: number | null;
          current_rep_id: string | null;
          status: DoctorStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          full_name_raw: string | null;
          region: string | null;
          county: string | null;
          brick_code: string | null;
          dynamic_category: DynamicCategory | null;
          budget_2025: number | null;
          budget_2026: number | null;
          disbursed_2025: number | null;
          disbursed_2026: number | null;
          incentive_2025: number | null;
          incentive_2026: number | null;
          priority_color: PriorityColor | null;
          pharmacy_1: string | null;
          pharmacy_2: string | null;
          weekly_rx_aknicare: number | null;
          weekly_rx_closebax: number | null;
          weekly_rx_terproline: number | null;
          weekly_rx_rosacure: number | null;
          current_rep_id: string | null;
          status: DoctorStatus;
        }> & {
          last_name: string;
          first_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["doctors"]["Row"]>;
      };
      territory_assignments: {
        Row: {
          id: string;
          doctor_id: string;
          rep_id: string;
          valid_from: string;
          valid_to: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          doctor_id: string;
          rep_id: string;
          valid_from?: string;
          valid_to?: string | null;
          created_by?: string | null;
        };
        Update: Partial<{
          valid_from: string;
          valid_to: string | null;
        }>;
      };
      cycles: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
        };
        Update: Partial<{
          name: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
        }>;
      };
      cycle_targets: {
        Row: {
          id: string;
          rep_id: string;
          cycle_id: string;
          target_visits: number;
          target_coverage_pct: number;
          set_by: string | null;
          set_at: string;
        };
        Insert: {
          rep_id: string;
          cycle_id: string;
          target_visits?: number;
          target_coverage_pct?: number;
          set_by?: string | null;
        };
        Update: Partial<{
          target_visits: number;
          target_coverage_pct: number;
        }>;
      };
      visits: {
        Row: {
          id: string;
          doctor_id: string;
          rep_id: string;
          cycle_id: string;
          visit_type: VisitType;
          status: VisitStatus;
          scheduled_date: string | null;
          completed_date: string | null;
          notes: string | null;
          location_context: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          visit_type: VisitType;
          status: VisitStatus;
          scheduled_date: string | null;
          completed_date: string | null;
          notes: string | null;
          location_context: string | null;
        }> & {
          doctor_id: string;
          rep_id: string;
          cycle_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Row"]>;
      };
      visit_products: {
        Row: {
          id: string;
          visit_id: string;
          product_name: ProductName;
          samples_given: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          visit_id: string;
          product_name: ProductName;
          samples_given?: number;
          notes?: string | null;
        };
        Update: Partial<{
          samples_given: number;
          notes: string | null;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
  };
}
