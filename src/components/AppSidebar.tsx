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
  ListTodo
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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

const items = [
  { title: 'Dashboard', url: '/app/dashboard', icon: Home },
  { title: 'Subir Imágenes', url: '/app/uploads', icon: Upload },
  { title: 'Mapa', url: '/app/map', icon: Map },
  { title: 'Revisión', url: '/app/review', icon: CheckSquare },
  { title: 'Áreas', url: '/app/areas', icon: Square },
  { title: 'Vuelos', url: '/app/flights', icon: Plane },
  { title: 'Modelos', url: '/app/models', icon: Brain },
  { title: 'Trabajos', url: '/app/jobs', icon: ListTodo },
  { title: 'Configuración', url: '/app/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-700 font-semibold">
            PlasticWatch
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