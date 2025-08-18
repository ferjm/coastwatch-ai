import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Upload, 
  Map, 
  CheckSquare, 
  Square, 
  Plane, 
  Brain, 
  Settings,
  BarChart3,
  ListTodo,
  Users
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
    { title: t('dashboard'), url: '/app/dashboard', icon: Home },
    { title: t('uploads'), url: '/app/uploads', icon: Upload },
    { title: t('map'), url: '/app/map', icon: Map },
    { title: t('review'), url: '/app/review', icon: CheckSquare },
    { title: t('areas'), url: '/app/areas', icon: Square },
    { title: t('flights'), url: '/app/flights', icon: Plane },
    { title: t('models'), url: '/app/models', icon: Brain },
    { title: t('jobs'), url: '/app/jobs', icon: ListTodo },
    { title: t('settings'), url: '/app/settings', icon: Settings },
    ...(hasRole('admin') ? [{ title: t('users'), url: '/app/users', icon: Users }] : []),
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-700 font-semibold">
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