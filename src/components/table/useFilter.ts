import React, { useState } from 'react';
import { useSessionStorage } from 'usehooks-ts';

export default function useFilter(name: string, defaultValue: string | Date | null) {
  const [filterValue, setFilterValue] = useSessionStorage<string | Date | null>(name, defaultValue);

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement> | Date | string | null
  ) => {
    if (event instanceof Date) {
      setFilterValue(event);
      return;
    }

    if (event === null || typeof event === 'string') {
      setFilterValue(event);
      return;
    }

    setFilterValue(event.target.value);
  };

  return {
    filterValue,
    setFilterValue,
    handleFilterChange,
  };
}
