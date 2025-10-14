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
    <div className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Project:</span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {selectedSite?.location_name || 'Select a project'}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px]">
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => onSiteSelect(site)}
                    className="cursor-pointer"
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
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No projects yet
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedSite && (
            <div className="text-sm text-muted-foreground">
              Status: <span className="text-foreground font-medium">{selectedSite.status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;
