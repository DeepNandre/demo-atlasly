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
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-3 min-w-[280px] justify-between h-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3 h-3 text-primary" />
            </div>
            <span className="truncate font-medium text-sm">
              {selectedSite?.location_name || 'Select a project'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 shadow-xl">
        <DropdownMenuLabel className="flex items-center gap-2 px-4 py-3 text-base font-semibold">
          <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
            <MapIcon className="w-3 h-3 text-primary" />
          </div>
          Your Site Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-800" />
        
        <div className="max-h-64 overflow-y-auto">
          {sites.map((site) => (
            <DropdownMenuItem
              key={site.id}
              onClick={() => onSiteSelect(site)}
              className="cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                      {site.location_name}
                    </span>
                    <Badge 
                      className={`text-xs px-2 py-1 ${getStatusColor(site.status)}`}
                      variant="secondary"
                    >
                      {site.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(site.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs hover:bg-primary/10 text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/preview/${site.id}`);
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        
        {sites.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <MapIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No projects yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Create your first site pack to get started</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/generate')}
              className="gap-2 shadow-sm"
            >
              <Plus className="w-3 h-3" />
              Create Project
            </Button>
          </div>
        )}
        
        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-800" />
        <DropdownMenuItem 
          onClick={() => navigate('/generate')}
          className="cursor-pointer p-4 text-primary hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">Create New Project</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Start a new site analysis</div>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectSelector;
