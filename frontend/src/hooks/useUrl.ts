import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { ShortenedUrl, UrlMetadata, UrlStats } from '@/types/api';
import axios from 'axios';

export const useShortenUrl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { originalUrl: string; customCode?: string }) => {
      const response = await apiClient.post<ShortenedUrl>('/urls', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      toast.success(`URL shortened: ${data.shortCode}`);
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to shorten URL';
      toast.error(message);
    },
  });
};

export const useUrlMetadata = (shortCode: string) => {
  return useQuery({
    queryKey: ['url', shortCode],
    queryFn: async () => {
      const response = await apiClient.get<UrlMetadata>(`/urls/${shortCode}`);
      return response.data;
    },
    enabled: !!shortCode,
  });
};

export const useUrlStats = (shortCode: string) => {
  return useQuery({
    queryKey: ['stats', shortCode],
    queryFn: async () => {
      const response = await apiClient.get<UrlStats>(`/urls/${shortCode}/stats`);
      return response.data;
    },
    enabled: !!shortCode,
    refetchInterval: 30000, // Refetch every 30s
  });
};

export const useDeactivateUrl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shortCode: string) => {
      await apiClient.delete(`/urls/${shortCode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['url'] });
      toast.success('URL deactivated');
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to deactivate URL';
      toast.error(message);
    },
  });
};
