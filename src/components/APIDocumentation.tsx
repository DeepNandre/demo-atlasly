import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function APIDocumentation() {
  const { toast } = useToast();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code snippet copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Documentation</h2>
        <p className="text-muted-foreground">
          Learn how to integrate SiteIQ into your applications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
          <CardDescription>All API requests should be made to:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 bg-muted p-3 rounded-lg font-mono text-sm">
            <code className="flex-1">{baseUrl}/functions/v1/api-gateway</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(`${baseUrl}/functions/v1/api-gateway`)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Include your API key in every request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            All requests must include your API key in the <code className="bg-muted px-2 py-1 rounded">X-API-Key</code> header:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <pre className="text-sm overflow-x-auto">
{`curl -H "X-API-Key: sk_your_api_key_here" \\
     -H "Content-Type: application/json" \\
     ${baseUrl}/functions/v1/api-gateway/v1/analyze-site`}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(`curl -H "X-API-Key: sk_your_api_key_here" \\
     -H "Content-Type: application/json" \\
     ${baseUrl}/functions/v1/api-gateway/v1/analyze-site`)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analyze-site" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyze-site">Analyze Site</TabsTrigger>
          <TabsTrigger value="get-status">Get Status</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze-site" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>POST /v1/analyze-site</CardTitle>
                <Badge>Async</Badge>
              </div>
              <CardDescription>
                Create a comprehensive site analysis for any location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <pre className="text-sm overflow-x-auto">
{`{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 500,
  "boundary": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    }
  }
}`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 500
}`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response (202 Accepted)</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "site_request_id": "uuid-here",
  "status": "processing",
  "message": "Site analysis started",
  "estimated_time_seconds": 30
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example (cURL)</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <pre className="text-sm overflow-x-auto">
{`curl -X POST \\
  -H "X-API-Key: sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"latitude":37.7749,"longitude":-122.4194,"radius":500}' \\
  ${baseUrl}/functions/v1/api-gateway/v1/analyze-site`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`curl -X POST \\
  -H "X-API-Key: sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"latitude":37.7749,"longitude":-122.4194,"radius":500}' \\
  ${baseUrl}/functions/v1/api-gateway/v1/analyze-site`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example (JavaScript)</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <pre className="text-sm overflow-x-auto">
{`const response = await fetch(
  '${baseUrl}/functions/v1/api-gateway/v1/analyze-site',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'sk_your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 500
    })
  }
);

const data = await response.json();
console.log('Site Request ID:', data.site_request_id);

// Poll for completion
const checkStatus = async () => {
  const statusRes = await fetch(
    \`\${baseUrl}/functions/v1/api-gateway/v1/site/\${data.site_request_id}\`,
    {
      headers: { 'X-API-Key': 'sk_your_api_key' }
    }
  );
  return statusRes.json();
};

// Check status every 5 seconds
const pollInterval = setInterval(async () => {
  const status = await checkStatus();
  if (status.status === 'completed') {
    console.log('Download URL:', status.file_url);
    clearInterval(pollInterval);
  }
}, 5000);`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`const response = await fetch(
  '${baseUrl}/functions/v1/api-gateway/v1/analyze-site',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'sk_your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 500
    })
  }
);

const data = await response.json();
console.log(data.site_request_id);`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="get-status" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>GET /v1/site/{"{"} id {"}"}</CardTitle>
                <Badge variant="secondary">Sync</Badge>
              </div>
              <CardDescription>
                Check the status and retrieve results of a site analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">URL Parameters</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">
                    <code className="bg-background px-2 py-1 rounded">id</code> - The site_request_id returned from the analyze-site endpoint
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response (200 OK)</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "id": "uuid-here",
  "status": "completed",
  "progress": 100,
  "location": {
    "name": "San Francisco, CA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius_meters": 500
  },
  "file_url": "https://...",
  "preview_image_url": "https://...",
  "created_at": "2025-01-01T00:00:00Z",
  "completed_at": "2025-01-01T00:00:30Z"
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example (cURL)</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <pre className="text-sm overflow-x-auto">
{`curl -H "X-API-Key: sk_your_api_key" \\
  ${baseUrl}/functions/v1/api-gateway/v1/site/[site_request_id]`}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`curl -H "X-API-Key: sk_your_api_key" \\
  ${baseUrl}/functions/v1/api-gateway/v1/site/[site_request_id]`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Status Values</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">pending</Badge>
                    <span>Analysis is queued and waiting to start</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">processing</Badge>
                    <span>Analysis is currently in progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">completed</Badge>
                    <span>Analysis finished successfully, files are ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">failed</Badge>
                    <span>Analysis encountered an error (check error_message)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>POST /v1/chat</CardTitle>
                <Badge variant="secondary">Sync</Badge>
              </div>
              <CardDescription>
                Ask questions about a site using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "site_request_id": "uuid-here",
  "question": "What are the solar exposure characteristics?"
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response (200 OK)</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`{
  "answer": "Based on the site analysis...",
  "context": {
    "location": "San Francisco, CA",
    "solar_potential": "high"
  }
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>API request quotas by plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Free Tier</span>
              <Badge variant="outline">1,000 requests/hour</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Pro</span>
              <Badge variant="outline">5,000 requests/hour</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Teams</span>
              <Badge variant="outline">10,000 requests/hour</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-4">
              <Badge variant="destructive" className="w-12 justify-center">401</Badge>
              <span>Invalid or missing API key</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive" className="w-12 justify-center">429</Badge>
              <span>Rate limit exceeded</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive" className="w-12 justify-center">400</Badge>
              <span>Invalid request parameters</span>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive" className="w-12 justify-center">500</Badge>
              <span>Internal server error</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
