import { ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SiteRequest } from '@/pages/SiteAI';

interface ProjectSelectorProps {
  sites: SiteRequest[];
  selectedSite: SiteRequest | null;
  onSiteSelect: (site: SiteRequest) => void;
}

const ProjectSelector = ({ sites, selectedSite, onSiteSelect }: ProjectSelectorProps) => {
  return (
    <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Project:</span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[280px] justify-between h-10 bg-background/60">
                  <span className="truncate">{selectedSite?.location_name || 'Select a project'}</span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[320px] bg-background/95 backdrop-blur-sm">
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => onSiteSelect(site)}
                    className="cursor-pointer py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{site.location_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(site.created_at).toLocaleDateString()} • {site.status}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                {sites.length === 0 && (
                  <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                    No projects yet
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedSite && (
            <div className="text-sm">
              <span className="text-muted-foreground">Status: </span>
              <span className="text-foreground font-medium capitalize">{selectedSite.status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;
