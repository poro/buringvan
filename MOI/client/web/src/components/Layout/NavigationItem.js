import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

function NavigationItem({ item, isActive, onClick }) {
  const IconComponent = item.icon;

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={onClick}
        selected={isActive}
        sx={{
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.contrastText',
            },
          },
        }}
      >
        <ListItemIcon>
          <IconComponent />
        </ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
}

export default NavigationItem;
