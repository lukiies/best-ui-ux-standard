# =============================================================================
# Multi-stage .NET 9 Docker build — optimized for production
# =============================================================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Copy csproj and restore (layer caching)
COPY Api.csproj .
RUN dotnet restore

# Copy source and publish
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# Stage 2: Runtime (chiseled for minimal attack surface)
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy published app
COPY --from=build /app .

# Non-root user
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -D appuser
USER appuser

EXPOSE 8080

ENTRYPOINT ["dotnet", "Api.dll"]
