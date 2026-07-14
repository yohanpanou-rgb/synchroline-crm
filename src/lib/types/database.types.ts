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
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
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
        Relationships: [];
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
        Relationships: [];
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
        Update: Partial<{
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
        }>;
        Relationships: [
          {
            foreignKeyName: "doctors_brick_code_fkey";
            columns: ["brick_code"];
            isOneToOne: false;
            referencedRelation: "bricks";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "doctors_current_rep_id_fkey";
            columns: ["current_rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "territory_assignments_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "territory_assignments_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "territory_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
          set_at?: string;
        };
        Update: Partial<{
          target_visits: number;
          target_coverage_pct: number;
          set_by: string | null;
          set_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "cycle_targets_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cycle_targets_cycle_id_fkey";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "cycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cycle_targets_set_by_fkey";
            columns: ["set_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Update: Partial<{
          doctor_id: string;
          rep_id: string;
          cycle_id: string;
          visit_type: VisitType;
          status: VisitStatus;
          scheduled_date: string | null;
          completed_date: string | null;
          notes: string | null;
          location_context: string | null;
        }>;
        Relationships: [
          {
            foreignKeyName: "visits_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_cycle_id_fkey";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "cycles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "visit_products_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
