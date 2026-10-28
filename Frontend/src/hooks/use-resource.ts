'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';

export function useResource<T>(path: string) {
  const [state, setState] = useState<{ path: string; data: T | null; error: string }>({
    path: '',
    data: null,
    error: '',
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void api.get<T>(path).then(
      (data) => {
        if (active) setState({ path, data, error: '' });
      },
      (error) => {
        if (active)
          setState({
            path,
            data: null,
            error: error instanceof Error ? error.message : 'Unable to load data.',
          });
      },
    );
    return () => {
      active = false;
    };
  }, [path, revision]);
  const reload = useCallback(() => {
    setState({ path: '', data: null, error: '' });
    setRevision((value) => value + 1);
  }, []);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : '',
    loading: state.path !== path,
    reload,
  };
}
