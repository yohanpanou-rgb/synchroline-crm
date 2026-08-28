// Hand-written to match supabase/migrations/*.sql (Phase 1).
// Regenerate with `supabase gen types typescript` once the Supabase CLI
// is linked to the project, and this file becomes redundant.

export type UserRole = "rep" | "manager" | "admin";
export type DoctorStatus = "active" | "pending_approval" | "archived";
export type DynamicCategory = "Α" | "Β" | "Γ";
/** Αριθμητική κλίμακα (1,2,3,...), ανοιχτή — χωρίς CHECK constraint στη βάση. */
export type PriorityColor = string;
export type VisitType = "normal" | "joint";
export type VisitStatus = "planned" | "completed" | "cancelled";
export type ProductName = "aknicare" | "closebax" | "terproline" | "rosacure";
export type HqType = "ΕΔΡΑ" | "ΕΠΑΡΧΙΑ";
export type RatingCpo = "0" | "1" | "2" | "3" | "ΥΔ";
export type AuditAction = "insert" | "update" | "delete";

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
          can_visit_syggros: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          is_active?: boolean;
          can_visit_syggros?: boolean;
        };
        Update: Partial<{
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          can_visit_syggros: boolean;
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
          weekly_rx_terproline: string | null;
          weekly_rx_rosacure: number | null;
          current_rep_id: string | null;
          status: DoctorStatus;
          specialty: string | null;
          phone_1: string | null;
          phone_2: string | null;
          address: string | null;
          notes: string | null;
          hq_type: HqType | null;
          rating_cpo: RatingCpo;
          institution: string | null;
          academic_title: string | null;
          is_candela_client: boolean;
          postal_code: string | null;
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
          weekly_rx_terproline: string | null;
          weekly_rx_rosacure: number | null;
          current_rep_id: string | null;
          status: DoctorStatus;
          specialty: string | null;
          phone_1: string | null;
          phone_2: string | null;
          address: string | null;
          notes: string | null;
          hq_type: HqType | null;
          rating_cpo: RatingCpo;
          institution: string | null;
          academic_title: string | null;
          is_candela_client: boolean;
          postal_code: string | null;
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
          weekly_rx_terproline: string | null;
          weekly_rx_rosacure: number | null;
          current_rep_id: string | null;
          status: DoctorStatus;
          specialty: string | null;
          phone_1: string | null;
          phone_2: string | null;
          address: string | null;
          notes: string | null;
          hq_type: HqType | null;
          rating_cpo: RatingCpo;
          institution: string | null;
          academic_title: string | null;
          is_candela_client: boolean;
          postal_code: string | null;
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
          scheduled_time: string | null;
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
          scheduled_time: string | null;
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
          scheduled_time: string | null;
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
      pharmacy_visits: {
        Row: {
          id: string;
          rep_id: string;
          cycle_id: string;
          visit_date: string;
          pharmacy_name: string;
          nearby_doctor_id: string | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          visit_date: string;
          nearby_doctor_id: string | null;
        }> & {
          rep_id: string;
          cycle_id: string;
          pharmacy_name: string;
          notes: string;
        };
        Update: Partial<{
          rep_id: string;
          cycle_id: string;
          visit_date: string;
          pharmacy_name: string;
          nearby_doctor_id: string | null;
          notes: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "pharmacy_visits_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pharmacy_visits_cycle_id_fkey";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "cycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pharmacy_visits_nearby_doctor_id_fkey";
            columns: ["nearby_doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: AuditAction;
          changed_by: string | null;
          changed_at: string;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "activity_audit_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      login_rate_limits: {
        Row: {
          id: string;
          identifier: string;
          attempted_at: string;
        };
        Insert: {
          identifier: string;
          attempted_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      sales_records: {
        Row: {
          id: string;
          sale_date: string;
          sub_brand: string;
          nomos: string;
          delivery_nomos: string | null;
          product_code: string;
          product_description: string | null;
          customer_code: string | null;
          customer_name: string | null;
          quantity: number;
          net_value: number;
          is_sample: boolean;
          created_at: string;
        };
        Insert: {
          sale_date: string;
          sub_brand: string;
          nomos: string;
          delivery_nomos?: string | null;
          product_code: string;
          product_description?: string | null;
          customer_code?: string | null;
          customer_name?: string | null;
          quantity?: number;
          net_value?: number;
          is_sample?: boolean;
        };
        Update: never;
        Relationships: [];
      };
      sales_territory_reps: {
        Row: {
          id: string;
          nomos: string;
          rep_id: string;
          created_at: string;
        };
        Insert: {
          nomos: string;
          rep_id: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "sales_territory_reps_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pharmacies: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          city?: string | null;
        };
        Update: Partial<{
          name: string;
          city: string | null;
        }>;
        Relationships: [];
      };
      doctor_pharmacies: {
        Row: {
          id: string;
          doctor_id: string;
          pharmacy_id: string;
          role: "primary" | "secondary";
          created_at: string;
        };
        Insert: {
          doctor_id: string;
          pharmacy_id: string;
          role?: "primary" | "secondary";
        };
        Update: Partial<{
          role: "primary" | "secondary";
        }>;
        Relationships: [
          {
            foreignKeyName: "doctor_pharmacies_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctor_pharmacies_pharmacy_id_fkey";
            columns: ["pharmacy_id"];
            isOneToOne: false;
            referencedRelation: "pharmacies";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          is_shared: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          is_shared?: boolean;
        };
        Update: Partial<{
          name: string;
          is_shared: boolean;
        }>;
        Relationships: [];
      };
      postal_code_bricks: {
        Row: {
          postal_code: string;
          city: string | null;
          brick_code: string | null;
          county: string | null;
        };
        Insert: {
          postal_code: string;
          city?: string | null;
          brick_code?: string | null;
          county?: string | null;
        };
        Update: Partial<{
          postal_code: string;
          city: string | null;
          brick_code: string | null;
          county: string | null;
        }>;
        Relationships: [];
      };
      visit_competitor_mentions: {
        Row: {
          id: string;
          visit_id: string;
          category: string;
          competitor_name: string;
          created_at: string;
        };
        Insert: {
          visit_id: string;
          category: string;
          competitor_name: string;
        };
        Update: Partial<{
          category: string;
          competitor_name: string;
        }>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          message: string;
          link?: string | null;
          created_by?: string | null;
        };
        Update: Partial<{
          is_read: boolean;
        }>;
        Relationships: [];
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
