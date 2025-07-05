# Requirements for app 'SmartWiki'
- Look and feel of RAG app based on following example: https://deepwiki.com/microsoft/vscode
- RAG framework based on AWS Bedrock Knowledge Bases, detailed research available here: research/aws-bedrock (recursive file/folder content)
- Users upload their own files to the website
- Their files are converted to markdown if not already
- original files in original format are available as a link including thumbnail
- Multi-tenant system with oauth
- agentic system built in allows different agents to be added to the system to leverage the RAG system as context.
- the first agent is a compliance helper. it allows you to tick the documents you want to use as context (in this case the documents would be compliance standards), and using these compliance doucments helps the user to create a compliance report against another document provided by the user.