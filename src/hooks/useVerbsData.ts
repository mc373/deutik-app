import { useState, useEffect } from "react";
import axios from "axios";

export interface VerbData {
  lemma: string;
  third_singular: string;
  past: string;
  perfect: string;
  cgroup: string;
  comments: string;
}

export interface VerbsResponse {
  metadata: {
    total: number;
    columns: Array<{
      key: string;
      label: string;
      width: string;
    }>;
    lastUpdated: string;
    cacheTtl: number;
  };
  data: VerbData[];
}

export const useVerbsData = () => {
  const [data, setData] = useState<VerbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerbs = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get<VerbsResponse>(
          "http://app.deutik.com/verbs/table?bypass=true",
          {
            timeout: 10000,
            headers: {
              Accept: "application/json",
            },
          }
        );
        console.log("Fetched verbs data:", response.data.data);
        setData(response.data.data);
      } catch (err) {
        setError(
          axios.isAxiosError(err) ? err.message : "Failed to fetch verbs data"
        );
        console.error("Error fetching verbs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVerbs();
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<VerbsResponse>(
        "http://app.deutik.com/verbs/table"
      );
      setData(response.data.data);
    } catch (err) {
      setError(
        axios.isAxiosError(err) ? err.message : "Failed to refetch data"
      );
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};
