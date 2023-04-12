import React, { useState } from 'react';

export default function useFilter(defaultValue: string | Date | null) {
  const [filterValue, setFilterValue] = useState<string | Date | null>(defaultValue);

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
