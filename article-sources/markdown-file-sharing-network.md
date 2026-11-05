# Markdown File Sharing Across Agents with MCP, OAuth, and AWS

A useful explanation often starts in a chat and becomes a project note, a decision, or a handoff. The difficulty is finding that document again when the next task happens in another tool.

This project gives Markdown a shared destination. An MCP client can upload a document; the Telemetry web workspace lets a person find, read, and edit it. S3 holds the content, while DynamoDB holds the document index. Both access paths use the same storage service.

[GitHub repository](https://github.com/gopalcb/markdown-file-sharing-network-across-agents) · [Repository README](https://github.com/gopalcb/markdown-file-sharing-network-across-agents#readme)

## 1. Make Markdown the sharing unit

Imagine finishing an API discussion and saving `api-design.md`. The next person needs the document without reconstructing the conversation or copying it between devices.

The sharing unit is a Markdown file with a category and a stable identity. The UI can list it, open its current content, and handle later edits. There is no model call in the document-storage path.

```text
┌─────────────────────────────────────┐
│ Chat or coding-agent client         │
│ Prepare api-design.md               │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Shared document service             │
│ Validate, store, return result      │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Telemetry web workspace             │
│ Find, read, and edit Markdown       │
└─────────────────────────────────────┘
```

The README names ChatGPT, Claude, Codex, and Claude Code as intended client integration points. Actual availability depends on each client's MCP support and the configured OAuth callback rules. The implementation currently exposes an upload tool; browsing and editing are documented here through the web workspace.

## 2. Two entry points, one storage implementation

The repository combines a Flask portal and a FastMCP server in one Lambda runtime. `TelemetryApplication` dispatches MCP and OAuth paths to the ASGI application and portal traffic to Flask. These interfaces keep their own authentication checks and converge on shared document storage.

```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ MCP client                      │       │ Telemetry browser UI            │
│ Cognito-backed OAuth            │       │ CloudFront + browser session    │
└─────────────────────────────────┘       └─────────────────────────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │ Amazon API Gateway              │
                     │ Route requests to Lambda        │
                     └─────────────────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │ Shared Lambda runtime           │
                     │ FastMCP / Flask                 │
                     │ Auth + document validation      │
                     └─────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Amazon S3                       │       │ Amazon DynamoDB                 │
│ Markdown content                │       │ Document index and records      │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

CloudFront serves the UI assets and forwards browser API requests. Keeping the byte-storage and indexing logic shared means the MCP upload path and portal do not need competing implementations of document identity or write outcomes.

### Authentication happens before storage

The MCP application advertises its protected resource and authorization server. Its Cognito-backed OAuth layer handles the sign-in flow; ingress middleware checks the configured resource, scope, and subject before accepting an upload. Browser sessions use their own portal authentication boundary.

An uploaded `username` is not proof of identity. Token verification and the configured subject binding decide who may use the service. The current upload schema is personal and restricts the username; it is not an arbitrary multi-user storage API.

## 3. A small MCP tool with a bounded input

The tool itself stays short. This excerpt from `telemetry-api/mcp_api/app.py` delegates storage instead of embedding AWS operations in the tool definition:

```python
@mcp.tool()
async def save_markdown(payload: UploadBatch) -> dict:
    """Save Markdown through shared telemetry storage; reconcile uncertain files."""

    return await save_batch(payload, config)
```

A client can supply a payload like this. The tool schema provides the configured personal username default:

```json
{
  "file-group": "project-notes",
  "files": [
    {
      "name": "api-design.md",
      "content": "# API design\n\nUse explicit routes and version checks.",
      "metadata": { "project": "orders-api" }
    }
  ]
}
```

Before storage, Pydantic rejects unknown fields and invalid names. `prepare_payload()` checks UTF-8 byte sizes and duplicate destinations. A batch holds 1–10 files, each at most 256 KiB, with a combined content limit of 2,000,000 bytes.

The category groups the document for later browsing. The shared service derives a canonical path for this upload mode; editorial metadata cannot choose an arbitrary bucket or storage prefix.

## 4. Successful upload means confirmed storage

A request reaching Lambda does not mean its document is safely available. S3 and DynamoDB are separate writes, so the implementation reports per-file outcomes rather than treating a batch as one atomic transaction.

```text
┌─────────────────────────────────────┐
│ Validate the complete input batch   │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Resolve document identity / path    │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Write Markdown bytes to S3          │
│ Conditional write protects path     │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Publish READY index in DynamoDB     │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Return file ID, status, and hash    │
└─────────────────────────────────────┘
```

`store_documents()` processes files independently. A confirmed result includes the file ID, `READY` status, and a SHA-256 hash. An unresolved write returns `INCOMPLETE` for that file; an earlier S3 write may still have happened.

The final aggregation in `save_batch()` makes the batch-level meaning explicit:

```python
return {
    'success': all(item['status'] == 'READY' for item in results),
    'files': results,
}
```

Inspect the per-file results. When an outcome is uncertain, reconcile the file ID before retrying. This prevents a lost response from being mistaken for a definite failure. The MCP storage adapter also disables automatic AWS write retries so that uncertain writes are not silently repeated.

## 5. Find and revise the document in Telemetry

In **Workspace → Documents**, the Angular UI lists documents, filters categories and ownership, opens Markdown, and loads further pages when requested. Search matches filename, category, and owner in the loaded list; it is not a full-content search over the entire S3 bucket.

For an eligible owned document, the editor sends its current ETag with the new content. The storage service uses that value in the S3 write. These are the relevant arguments from `replace_document()`:

```python
storage.s3.put_object(
    **location,
    Body=payload['changes']['content'].encode(),
    IfMatch=payload['changes']['expected_etag'],
    ContentType='text/markdown; charset=utf-8',
    ServerSideEncryption='AES256',
    Metadata=metadata,
)
```

If another edit changed the object, the precondition fails and the service raises a document conflict. The UI preserves the unsaved draft and asks the user to reopen the latest version. Documents that cannot be revised in place follow the edited-copy path in the user's folder.

```text
                     ┌─────────────────────────────────┐
                     │ Edited Markdown + current ETag  │
                     └─────────────────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │ Eligible for revision?          │
                     └─────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
                yes                                       no
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Conditional update              │       │ Save edited copy                │
│ IfMatch with the current ETag   │       │ Original remains unchanged      │
└─────────────────────────────────┘       └─────────────────────────────────┘
                 │                                         │
                 ▼                                         ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Match: save current document    │       │ Open the saved copy             │
│ Conflict: keep draft and reload │       │ Continue with the new document  │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

The same principle appears throughout the design: preserve the document and make uncertain or conflicting outcomes visible.

## 6. Follow the implementation

The article follows the repository README and source reviewed on 2026-11-05. Its diagrams describe the implementation architecture; client compatibility and private authentication still require integration testing in the intended environment.

- [README](https://github.com/gopalcb/markdown-file-sharing-network-across-agents#readme): the sharing model and validation commands.
- [Runtime dispatcher](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/server.py): Flask and FastMCP in one process.
- [MCP application](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/mcp_api/app.py): tool registration and resource discovery.
- [OAuth implementation](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/mcp_api/oauth_service.py): Cognito-backed sign-in and OAuth state.
- [Upload validation](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/mcp_api/validation_service.py): input schema and byte limits.
- [MCP storage adapter](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/mcp_api/storage_service.py): shared storage and batch results.
- [Document storage](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-api/document_api/s3_document_service.py): identity, writes, reads, and ETag checks.
- [Document workspace](https://github.com/gopalcb/markdown-file-sharing-network-across-agents/blob/main/telemetry-ui/src/app/components/documents/documents.component.ts): filters, editing, conflicts, and edited copies.
