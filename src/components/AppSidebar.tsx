import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  Map, 
  CheckSquare, 
  Settings,
  Users,
  Waves
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const { hasRole } = useAuthStore();

  const items = [
    { title: t('map'), url: '/app/map', icon: Map },
    { title: t('uploads'), url: '/app/uploads', icon: Upload },
    { title: t('review'), url: '/app/review', icon: CheckSquare },
    { title: t('settings'), url: '/app/settings', icon: Settings },
    ...(hasRole('admin') ? [{ title: t('users'), url: '/app/users', icon: Users }] : []),
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground font-bold text-xl flex items-center gap-3 py-4">
            <Waves className="h-6 w-6 text-primary" />
            {t('appName')}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}