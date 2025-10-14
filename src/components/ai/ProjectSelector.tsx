import { ChevronDown, MapPin, Plus, ExternalLink, Calendar, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { SiteRequest } from '@/pages/SiteAI';
import { useNavigate } from 'react-router-dom';

interface ProjectSelectorProps {
  sites: SiteRequest[];
  selectedSite: SiteRequest | null;
  onSiteSelect: (site: SiteRequest) => void;
}

const ProjectSelector = ({ sites, selectedSite, onSiteSelect }: ProjectSelectorProps) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">Project:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 min-w-[200px] justify-between h-9"
          >
            <span className="truncate">
              {selectedSite?.location_name || 'Select project'}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Your Projects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {sites.map((site) => (
            <DropdownMenuItem
              key={site.id}
              onClick={() => onSiteSelect(site)}
              className="cursor-pointer py-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded bg-accent/50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{site.location_name}</span>
                    <Badge 
                      className={`text-xs ${getStatusColor(site.status)}`}
                      variant="secondary"
                    >
                      {site.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(site.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          {sites.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/generate')}
                className="gap-2"
              >
                <Plus className="w-3 h-3" />
                Create Project
              </Button>
            </div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => navigate('/generate')}
            className="cursor-pointer py-2 text-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedSite && (
        <Badge className={getStatusColor(selectedSite.status)} variant="secondary">
          {selectedSite.status}
        </Badge>
      )}
    </div>
  );
};

export default ProjectSelector;
