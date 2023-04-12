import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import React, { useEffect, useState } from 'react';
import Iconify from '../iconify';

export type TableFilterBarProps = {
  config: {
    column: string;
    type: 'select' | 'text' | 'date';
    options?: string[] | null;
    defaultValue: string | Date | number | null;
    value: string | Date | number | null;
    onFilterEvent: React.EventHandler<any>;
  }[];
  isFiltered: boolean;
};

const INPUT_WIDTH = 160;

export function TableFilterBar({ config }: TableFilterBarProps) {
  const [isFiltered, setIsFiltered] = useState<boolean>(false);

  useEffect(() => {
    setIsFiltered(false);
    config.forEach((option) => option.value && setIsFiltered(true));
  }, [config]);

  const onResetFilter = () => {
    config.forEach((option) => {
      option.onFilterEvent(option.defaultValue);
    });
  };

  return (
    <>
      <Stack
        spacing={2}
        alignItems="center"
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{ px: 2.5, py: 3 }}
      >
        {config.map(({ column, type, value, options, onFilterEvent }) => {
          if (type === 'select') {
            return (
              <TextField
                fullWidth
                select
                label="Portal"
                value={value}
                onChange={onFilterEvent}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        maxHeight: 260,
                      },
                    },
                  },
                }}
                sx={{
                  maxWidth: { sm: 240 },
                  textTransform: 'capitalize',
                }}
              >
                {options &&
                  options.map((option) => (
                    <MenuItem
                      key={option}
                      value={option}
                      sx={{
                        mx: 1,
                        borderRadius: 0.75,
                        typography: 'body2',
                        textTransform: 'capitalize',
                      }}
                    >
                      {option}
                    </MenuItem>
                  ))}
              </TextField>
            );
          }

          if (type === 'date') {
            return (
              <DatePicker
                label="Data Carga"
                value={value}
                onChange={onFilterEvent}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    sx={{
                      maxWidth: { md: INPUT_WIDTH },
                    }}
                  />
                )}
              />
            );
          }

          return <></>;
        })}

        {isFiltered && (
          <Button
            color="error"
            sx={{ flexShrink: 0 }}
            onClick={onResetFilter}
            startIcon={<Iconify icon="eva:trash-2-outline" />}
          >
            Limpar
          </Button>
        )}
      </Stack>
    </>
  );
}
