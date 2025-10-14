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
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  
  return (
    <div className="border-b border-border/50 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">SiteIQ AI Assistant</h1>
                <p className="text-sm text-muted-foreground">Intelligent site analysis and planning</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-border mx-2" />
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Active Project:</span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-3 min-w-[320px] justify-between h-11 bg-background/80 border-border/50 hover:bg-background/90 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
                        <MapPin className="w-3 h-3" />
                      </div>
                      <span className="truncate font-medium">
                        {selectedSite?.location_name || 'Select a project'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[400px] bg-background/95 backdrop-blur-sm border-border/50">
                  <DropdownMenuLabel className="flex items-center gap-2 text-sm font-medium">
                    <MapIcon className="w-4 h-4" />
                    Your Site Projects
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {sites.map((site) => (
                    <DropdownMenuItem
                      key={site.id}
                      onClick={() => onSiteSelect(site)}
                      className="cursor-pointer py-4 px-3"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{site.location_name}</span>
                            <Badge 
                              className={`text-xs px-2 py-0.5 ${getStatusColor(site.status)}`}
                              variant="secondary"
                            >
                              {site.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                              className="h-5 px-2 text-xs hover:bg-accent/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/preview/${site.id}`);
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  {sites.length === 0 && (
                    <div className="px-3 py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <MapIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">No projects yet</p>
                      <p className="text-xs text-muted-foreground mb-3">Create your first site pack to get started</p>
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
                    className="cursor-pointer py-3 text-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {selectedSite && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium">{selectedSite.location_name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(selectedSite.created_at).toLocaleDateString()}
                </div>
              </div>
              <Badge 
                className={`${getStatusColor(selectedSite.status)} px-3 py-1`}
                variant="secondary"
              >
                {selectedSite.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/preview/${selectedSite.id}`)}
                className="gap-2"
              >
                <ExternalLink className="w-3 h-3" />
                View Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;
