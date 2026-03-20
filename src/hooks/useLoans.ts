import { useEffect, useState } from "react";
import { supabase } from "@/lib";
import type { Tables } from "@/types/database";

type LoanWithSource = Tables<"loans"> & {
  credit_sources: Tables<"credit_sources"> | null;
};

export function useLoans() {
  const [loans, setLoans] = useState<LoanWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoans = async () => {
      const { data, error: fetchError } = await supabase
        .from("loans")
        .select("*, credit_sources(*)");

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLoans(data ?? []);
      }
      setLoading(false);
    };

    void fetchLoans();
  }, []);

  return { loans, loading, error };
}
