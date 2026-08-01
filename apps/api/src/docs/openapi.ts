type HttpMethod="get"|"post"|"put"|"patch"|"delete";
type RouteDefinition={method:HttpMethod;path:string;tag:string;summary:string;security?:"account"|"admin"|"super"};

const routes:RouteDefinition[]=[
  {method:"get",path:"/health",tag:"System",summary:"Service health"},
  {method:"get",path:"/openapi.json",tag:"Documentation",summary:"OpenAPI 3.1 document"},
  {method:"get",path:"/docs",tag:"Documentation",summary:"Swagger UI"},
  {method:"get",path:"/songs",tag:"Songs",summary:"List published songs"},{method:"get",path:"/songs/:slug",tag:"Songs",summary:"Get published song"},
  {method:"get",path:"/videos",tag:"Videos",summary:"List published videos"},{method:"get",path:"/videos/:slug",tag:"Videos",summary:"Get published video"},
  {method:"get",path:"/artists",tag:"Artists",summary:"List verified artists"},{method:"get",path:"/artists/:slug",tag:"Artists",summary:"Get verified artist"},
  {method:"get",path:"/tor-tiv",tag:"Heritage",summary:"List Tor Tiv records"},{method:"get",path:"/categories",tag:"Catalog",summary:"List media categories"},
  {method:"get",path:"/community",tag:"Community",summary:"List published community posts"},{method:"get",path:"/community/:slug",tag:"Community",summary:"Get published community post"},
  {method:"get",path:"/donation",tag:"Settings",summary:"Get public donation settings"},{method:"get",path:"/media/:kind/:file",tag:"Media",summary:"Stream authorized media"},
  {method:"post",path:"/account/register",tag:"Authentication",summary:"Register member or artist"},{method:"post",path:"/account/login",tag:"Authentication",summary:"Sign in account"},
  {method:"post",path:"/account/refresh",tag:"Authentication",summary:"Rotate account session"},{method:"post",path:"/account/logout",tag:"Authentication",summary:"Sign out account"},
  {method:"get",path:"/account/me",tag:"Accounts",summary:"Get current account",security:"account"},{method:"get",path:"/account/songs",tag:"Accounts",summary:"List own songs",security:"account"},
  {method:"get",path:"/account/videos",tag:"Accounts",summary:"List own videos",security:"account"},{method:"get",path:"/account/community",tag:"Accounts",summary:"List own community posts",security:"account"},
  {method:"post",path:"/account/community",tag:"Uploads",summary:"Submit community media",security:"account"},{method:"post",path:"/account/songs",tag:"Uploads",summary:"Submit song metadata",security:"account"},
  {method:"post",path:"/account/media",tag:"Uploads",summary:"Upload and process music or video",security:"account"},
  {method:"get",path:"/account/notifications",tag:"Notifications",summary:"List notifications",security:"account"},{method:"patch",path:"/account/notifications/read",tag:"Notifications",summary:"Mark notifications read",security:"account"},
  {method:"post",path:"/admin/login",tag:"Admin Authentication",summary:"Sign in administrator"},{method:"post",path:"/admin/refresh",tag:"Admin Authentication",summary:"Rotate administrator session"},
  {method:"post",path:"/admin/logout",tag:"Admin Authentication",summary:"Sign out administrator"},{method:"get",path:"/admin/session",tag:"Admin Authentication",summary:"Check administrator session",security:"admin"},
  {method:"get",path:"/admin/donation",tag:"Admin Settings",summary:"Get donation settings",security:"super"},{method:"put",path:"/admin/donation",tag:"Admin Settings",summary:"Update donation settings",security:"super"},
  {method:"get",path:"/admin/accounts",tag:"Admin Users",summary:"List account approvals",security:"admin"},{method:"patch",path:"/admin/accounts/:id/approve",tag:"Admin Users",summary:"Approve artist account",security:"admin"},
  {method:"patch",path:"/admin/accounts/:id/reject",tag:"Admin Users",summary:"Reject artist account",security:"admin"},{method:"get",path:"/admin/overview",tag:"Admin",summary:"Dashboard overview",security:"admin"},
  {method:"get",path:"/admin/artists",tag:"Admin Artists",summary:"List artists",security:"admin"},{method:"post",path:"/admin/artists",tag:"Admin Artists",summary:"Create artist",security:"admin"},
  {method:"get",path:"/admin/songs",tag:"Admin Media",summary:"List songs",security:"admin"},{method:"post",path:"/admin/songs",tag:"Admin Media",summary:"Create song",security:"admin"},
  {method:"patch",path:"/admin/songs/:id/status",tag:"Admin Media",summary:"Moderate song",security:"admin"},{method:"delete",path:"/admin/songs/:id",tag:"Admin Media",summary:"Delete song",security:"admin"},
  {method:"get",path:"/admin/videos",tag:"Admin Media",summary:"List videos",security:"admin"},{method:"patch",path:"/admin/videos/:id/status",tag:"Admin Media",summary:"Moderate video",security:"admin"},
  {method:"delete",path:"/admin/videos/:id",tag:"Admin Media",summary:"Delete video",security:"admin"},{method:"get",path:"/admin/community",tag:"Admin Community",summary:"List community submissions",security:"admin"},
  {method:"patch",path:"/admin/community/:id/status",tag:"Admin Community",summary:"Moderate community submission",security:"admin"},{method:"delete",path:"/admin/community/:id",tag:"Admin Community",summary:"Delete community submission",security:"admin"},
  {method:"get",path:"/admin/tor-tiv",tag:"Admin Heritage",summary:"List Tor Tiv records",security:"admin"},{method:"post",path:"/admin/tor-tiv",tag:"Admin Heritage",summary:"Create Tor Tiv record",security:"admin"},
  {method:"delete",path:"/admin/tor-tiv/:id",tag:"Admin Heritage",summary:"Delete Tor Tiv record",security:"admin"},
  {method:"get",path:"/cms/settings",tag:"CMS",summary:"Get public website settings"},{method:"get",path:"/cms/entries/:kind",tag:"CMS",summary:"List published CMS entries"},
  {method:"get",path:"/cms/events",tag:"Realtime",summary:"Subscribe to server-sent events"},
  {method:"get",path:"/comments/:targetType/:targetId",tag:"Comments",summary:"List approved comments"},{method:"post",path:"/comments",tag:"Comments",summary:"Submit comment",security:"account"},
  {method:"post",path:"/comments/:id/like",tag:"Comments",summary:"Like comment",security:"account"},{method:"post",path:"/comments/:id/report",tag:"Comments",summary:"Report comment",security:"account"},
  {method:"post",path:"/reports",tag:"Reports",summary:"Report content",security:"account"},{method:"post",path:"/analytics",tag:"Analytics",summary:"Record public analytics event"},
  {method:"get",path:"/search",tag:"Search",summary:"Search public content"},{method:"get",path:"/search/suggestions",tag:"Search",summary:"List search suggestions"},
  {method:"get",path:"/admin/settings",tag:"Admin Settings",summary:"Get website settings",security:"admin"},{method:"put",path:"/admin/settings",tag:"Admin Settings",summary:"Update website settings",security:"admin"},
  {method:"get",path:"/admin/cms/:kind",tag:"Admin CMS",summary:"List CMS entries",security:"admin"},{method:"post",path:"/admin/cms",tag:"Admin CMS",summary:"Create CMS entry",security:"admin"},
  {method:"put",path:"/admin/cms/:id",tag:"Admin CMS",summary:"Update CMS entry",security:"admin"},{method:"patch",path:"/admin/cms/:id/status",tag:"Admin CMS",summary:"Change CMS status",security:"admin"},
  {method:"delete",path:"/admin/cms/:id",tag:"Admin CMS",summary:"Delete CMS entry",security:"admin"},{method:"post",path:"/admin/cms/bulk",tag:"Admin CMS",summary:"Bulk moderate CMS entries",security:"admin"},
  {method:"get",path:"/admin/cms/:kind/export",tag:"Admin CMS",summary:"Export CMS entries",security:"admin"},{method:"get",path:"/admin/audit",tag:"Admin Audit",summary:"List audit records",security:"admin"},
  {method:"get",path:"/admin/analytics",tag:"Admin Analytics",summary:"Get analytics dashboard",security:"admin"},{method:"get",path:"/admin/search-rules",tag:"Admin Search",summary:"List search rules",security:"admin"},
  {method:"post",path:"/admin/search-rules",tag:"Admin Search",summary:"Create or update search rule",security:"admin"},{method:"delete",path:"/admin/search-rules/:id",tag:"Admin Search",summary:"Delete search rule",security:"admin"},
  {method:"get",path:"/admin/email-templates",tag:"Admin Email",summary:"List email templates",security:"admin"},{method:"put",path:"/admin/email-templates/:key",tag:"Admin Email",summary:"Update email template",security:"admin"},
  {method:"get",path:"/admin/media",tag:"Admin Library",summary:"List media assets",security:"admin"},{method:"post",path:"/admin/media",tag:"Admin Library",summary:"Upload media asset",security:"admin"},
  {method:"patch",path:"/admin/media/:id",tag:"Admin Library",summary:"Update media asset",security:"admin"},{method:"delete",path:"/admin/media/:id",tag:"Admin Library",summary:"Delete media asset",security:"admin"},
  {method:"get",path:"/admin/comments",tag:"Admin Comments",summary:"List moderation queue",security:"admin"},{method:"patch",path:"/admin/comments/:id",tag:"Admin Comments",summary:"Moderate comment",security:"admin"},
  {method:"delete",path:"/admin/comments/:id",tag:"Admin Comments",summary:"Delete comment",security:"admin"},{method:"post",path:"/admin/comments/:id/action",tag:"Admin Comments",summary:"Warn, suspend, ban, or reply",security:"admin"},
  {method:"get",path:"/admin/users",tag:"Admin Users",summary:"Search user directory",security:"admin"},{method:"get",path:"/admin/users/export",tag:"Admin Users",summary:"Export user directory",security:"admin"},
  {method:"get",path:"/admin/users/:id",tag:"Admin Users",summary:"Get user profile",security:"admin"},{method:"patch",path:"/admin/users/:id",tag:"Admin Users",summary:"Edit user profile",security:"admin"},
  {method:"post",path:"/admin/users/:id/actions",tag:"Admin Users",summary:"Perform account action",security:"admin"},{method:"patch",path:"/admin/users/:id/status",tag:"Admin Users",summary:"Set account status",security:"admin"},
  {method:"patch",path:"/admin/users/:id/password",tag:"Admin Users",summary:"Reset account password",security:"admin"},{method:"patch",path:"/admin/users/:id/roles",tag:"Admin Users",summary:"Replace account roles",security:"admin"},
  {method:"get",path:"/admin/users/:id/activity",tag:"Admin Users",summary:"Get user activity",security:"admin"},{method:"post",path:"/admin/users/:id/warnings",tag:"Admin Users",summary:"Issue warning",security:"admin"},
  {method:"patch",path:"/admin/users/:id/warnings/:warningId",tag:"Admin Users",summary:"Resolve warning",security:"admin"},{method:"post",path:"/admin/users/:id/notes",tag:"Admin Users",summary:"Add private note",security:"admin"},
  {method:"delete",path:"/admin/users/:id/notes/:noteId",tag:"Admin Users",summary:"Delete private note",security:"admin"},{method:"delete",path:"/admin/users/:id/permanent",tag:"Admin Users",summary:"Permanently erase soft-deleted account",security:"super"},
  {method:"get",path:"/admin/reports",tag:"Admin Reports",summary:"List content reports",security:"admin"},{method:"patch",path:"/admin/reports/:id",tag:"Admin Reports",summary:"Resolve content report",security:"admin"},
  {method:"get",path:"/admin/backup",tag:"Admin Backup",summary:"Export CMS configuration",security:"super"}
];

const toOpenApiPath=(path:string)=>path.replace(/:([A-Za-z0-9_]+)/g,"{$1}");
const pathParameters=(path:string)=>[...path.matchAll(/:([A-Za-z0-9_]+)/g)].map(match=>({name:match[1],in:"path",required:true,schema:{type:"string"}}));
const paths:Record<string,Record<string,unknown>>={};
for(const route of routes){
  const path=toOpenApiPath(route.path);
  paths[path]??={};
  paths[path][route.method]={
    tags:[route.tag],summary:route.summary,operationId:`${route.method}_${route.path.replace(/[^a-zA-Z0-9]+/g,"_")}`,
    parameters:pathParameters(route.path),
    ...(route.security?{security:[{cookieAuth:[]}],"x-required-role":route.security}:{}),
    ...(!["get","delete"].includes(route.method)?{requestBody:{required:false,content:{"application/json":{schema:{type:"object",additionalProperties:true}},"multipart/form-data":{schema:{type:"object",additionalProperties:true}}}}}:{}),
    responses:{"200":{description:"Successful response"},"201":{description:"Created"},"202":{description:"Accepted"},"204":{description:"No content"},"400":{$ref:"#/components/responses/BadRequest"},"401":{$ref:"#/components/responses/Unauthorized"},"403":{$ref:"#/components/responses/Forbidden"},"404":{$ref:"#/components/responses/NotFound"},"422":{$ref:"#/components/responses/ValidationError"},"500":{$ref:"#/components/responses/ServerError"}}
  };
}

export const openapiDocument={
  openapi:"3.1.0",
  info:{title:"Tiv Songs API",version:"1.0.0",description:"Public, account, CMS, moderation and administrator API. Existing URLs are backward-compatible."},
  servers:[{url:"/api",description:"Same-origin API"},{url:"http://localhost:4000/api",description:"Local API"}],
  tags:[...new Set(routes.map(route=>route.tag))].map(name=>({name})),
  paths,
  components:{
    securitySchemes:{cookieAuth:{type:"apiKey",in:"cookie",name:"tiv_account_session",description:"HttpOnly session cookie. Administrator endpoints use tiv_admin_session."}},
    schemas:{Error:{type:"object",required:["error"],properties:{error:{type:"string"},details:{type:"object",additionalProperties:true}}}},
    responses:{
      BadRequest:{description:"Malformed request",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}},
      Unauthorized:{description:"Authentication required or expired",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}},
      Forbidden:{description:"Insufficient permission",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}},
      NotFound:{description:"Resource not found",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}},
      ValidationError:{description:"Zod validation failed",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}},
      ServerError:{description:"Unexpected server error",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}}
    }
  }
} as const;

export const swaggerHtml=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tiv Songs API Documentation</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"/api/openapi.json",dom_id:"#swagger-ui",deepLinking:true,persistAuthorization:true,displayRequestDuration:true});</script></body></html>`;
