import { useState } from 'react';
import {
  List, ListItemButton, ListItemText, Collapse, Chip, Box, Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useLang } from '../i18n/LangContext';
import type { CategoryNode } from '../lib/types';
import type { FilterState } from '../lib/search';

interface Props {
  categories: CategoryNode[];
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}

const keyOf = (n: CategoryNode) => n.code ?? n.name.en;

export default function CategoryTree({ categories, filters, onChange }: Props) {
  const { loc, t } = useLang();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{t('categories')}</Typography>
      <List dense disablePadding>
        <ListItemButton
          selected={!filters.cat1}
          onClick={() => onChange({ cat1: null, cat2: null, cat3: null })}
          sx={{ borderRadius: 1 }}
        >
          <ListItemText primary={t('allCategories')} />
        </ListItemButton>

        {categories.map((c1) => {
          const k1 = keyOf(c1);
          const sel1 = filters.cat1 === k1;
          const isOpen = open[k1] ?? sel1;
          return (
            <Box key={k1}>
              <ListItemButton
                selected={sel1 && !filters.cat2}
                sx={{ borderRadius: 1 }}
                onClick={() => {
                  onChange({ cat1: k1, cat2: null, cat3: null });
                  if (c1.children?.length) toggle(k1);
                }}
              >
                <ListItemText primary={loc(c1.name)} />
                <Chip size="small" label={c1.count} sx={{ mr: 0.5 }} />
                {c1.children?.length ? (isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />) : null}
              </ListItemButton>

              <Collapse in={isOpen} unmountOnExit>
                <List dense disablePadding sx={{ pl: 2 }}>
                  {c1.children?.map((c2) => {
                    const k2 = keyOf(c2);
                    const sel2 = filters.cat2 === k2;
                    const open2 = open[`${k1}/${k2}`] ?? sel2;
                    return (
                      <Box key={k2}>
                        <ListItemButton
                          selected={sel2 && !filters.cat3}
                          sx={{ borderRadius: 1 }}
                          onClick={() => {
                            onChange({ cat1: k1, cat2: k2, cat3: null });
                            if (c2.children?.length) toggle(`${k1}/${k2}`);
                          }}
                        >
                          <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={loc(c2.name)} />
                          <Chip size="small" variant="outlined" label={c2.count} sx={{ mr: 0.5 }} />
                          {c2.children?.length ? (open2 ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />) : null}
                        </ListItemButton>
                        <Collapse in={open2} unmountOnExit>
                          <List dense disablePadding sx={{ pl: 2 }}>
                            {c2.children?.map((c3) => {
                              const k3 = keyOf(c3);
                              return (
                                <ListItemButton
                                  key={k3}
                                  selected={filters.cat3 === k3}
                                  sx={{ borderRadius: 1 }}
                                  onClick={() => onChange({ cat1: k1, cat2: k2, cat3: k3 })}
                                >
                                  <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={loc(c3.name)} />
                                  <Chip size="small" variant="outlined" label={c3.count} />
                                </ListItemButton>
                              );
                            })}
                          </List>
                        </Collapse>
                      </Box>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
