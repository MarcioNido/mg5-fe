import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import React, { useEffect, useState } from 'react';
import Iconify from '../iconify';
import RhfCategoriesAutocomplete from "../../modules/categories/components/rhf-categories-autocomplete";
import {titleCase} from "tiny-case";

export type TableFilterBarProps = {
  config: {
    column: string;
    label: string;
    type: 'select' | 'text' | 'date' | 'month' | 'category';
    options?: {value: string | number; label: string | number; level?: number}[] | null;
    defaultValue: string | Date | number | null;
    value: string | Date | number | null;
    onFilterEvent: React.EventHandler<any>;
  }[];
  isFiltered: boolean;
};

const INPUT_WIDTH = 160;
const MONTH_INPUT_WIDTH = 200;

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
        {config.map(({ column, label, type, value, options, onFilterEvent }) => {
          if (type === 'select') {
            return (
              <TextField
                fullWidth
                select
                label={label}
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
                      // key={option.key}
                      value={option.value}
                      sx={{
                        mx: 1,
                        borderRadius: 0.75,
                        typography: 'body2',
                        textTransform: 'capitalize',
                      }}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
              </TextField>
            );
          }

          if (type === 'date') {
            return (
              <DatePicker
                label={label}
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

          if (type === 'month') {
            return (
                <DatePicker
                    label={label}
                    value={value}
                    views={['month', 'year']}
                    onChange={onFilterEvent}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            fullWidth
                            sx={{
                              maxWidth: { md: MONTH_INPUT_WIDTH },
                            }}
                        />
                    )}
                />
            );
          }

          if (type === 'category') {
            return (
                <TextField
                    fullWidth
                    select
                    label={label}
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
                  <MenuItem
                    value={-1}
                    sx={{
                        mx: 1,
                        borderRadius: 0.75,
                        typography: 'body2',
                        textTransform: 'capitalize',
                    }}
                    >
                    Uncategorised
                  </MenuItem>
                  {options &&
                      options.map((option) => (
                          <MenuItem
                              // key={option.key}
                              value={option.value}
                              sx={{
                                mx: 1,
                                borderRadius: 0.75,
                                typography: 'body2',
                                textTransform: 'capitalize',
                              }}
                          >
                            {
                              [...Array((option.level ?? 1) - 1)].map((e,i) =>
                                  <Iconify key={i} icon="eva:chevron-right-fill" sx={{ verticalAlign: 'middle', mr: 3 }} />
                              )
                            }
                            {titleCase(option.label.toString())}
                          </MenuItem>
                      ))}
                </TextField>
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
