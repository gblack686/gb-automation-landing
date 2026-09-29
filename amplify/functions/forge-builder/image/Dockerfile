FROM public.ecr.aws/lambda/nodejs:22
RUN dnf install -y python3.12 python3.12-pip && dnf clean all
RUN printf '%s\n' '#!/bin/sh' 'exec env LD_LIBRARY_PATH=/usr/lib64:/lib64 /usr/bin/python3.12 "$@"' > /usr/local/bin/forge-python && chmod 755 /usr/local/bin/forge-python
WORKDIR ${LAMBDA_TASK_ROOT}
COPY source/apps/forge-approval-pilot/package*.json ./apps/forge-approval-pilot/
COPY source/apps/forge-builder-host/package*.json source/apps/forge-builder-host/requirements.txt ./apps/forge-builder-host/
RUN forge-python -m pip install --no-cache-dir -r apps/forge-builder-host/requirements.txt \
 && npm ci --prefix apps/forge-approval-pilot --ignore-scripts --no-audit --no-fund \
 && npm ci --prefix apps/forge-builder-host --ignore-scripts --no-audit --no-fund
COPY source/ ./
COPY source-manifest.json ./host-source-manifest.json
ENV PYTHON=/usr/local/bin/forge-python PLAN_PUBLISH_BACKEND=off AGENT_OS_CONTRACT_PERSISTENCE=off
CMD ["apps/forge-builder-host/handler.handler"]
