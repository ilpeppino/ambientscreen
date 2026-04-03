import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  getIntegrationProviderAuthorizationUrl,
  listGoogleGmailLabels,
  listIntegrationConnections,
} from "../../services/api/integrationsApi";
import { DEEP_LINK_SCHEME } from "../../features/navigation/deepLinks";
import type { EmailFeedConfig, EmailFeedInspectorContext } from "./inspector";

interface UseEmailFeedInspectorContextOptions {
  provider: EmailFeedConfig["provider"];
  connectionId: string | undefined;
  onChange: (patch: Record<string, unknown>) => void;
}

interface UseEmailFeedInspectorContextResult extends EmailFeedInspectorContext {
  labelsLoading: boolean;
}

export function useEmailFeedInspectorContext({
  provider,
  connectionId,
  onChange,
}: UseEmailFeedInspectorContextOptions): UseEmailFeedInspectorContextResult {
  const [connections, setConnections] = useState<Array<{ id: string; label: string }>>([]);
  const [labels, setLabels] = useState<Array<{ id: string; label: string; type: "system" | "user" }>>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

  useEffect(() => {
    void listIntegrationConnections("google")
      .then((items) =>
        setConnections(
          items.map((connection) => ({
            id: connection.id,
            label:
              connection.accountLabel
              ?? connection.accountEmail
              ?? connection.externalAccountId
              ?? connection.provider,
          })),
        ),
      )
      .catch(() => setConnections([]));
  }, []);

  const loadLabels = useCallback(() => {
    if (provider !== "gmail" || !connectionId) {
      setLabels([]);
      return;
    }

    setLabelsLoading(true);
    void listGoogleGmailLabels(connectionId)
      .then((items) =>
        setLabels(
          items.map((item) => ({
            id: item.id,
            label: item.name,
            type: item.type,
          })),
        ),
      )
      .catch(() => setLabels([]))
      .finally(() => setLabelsLoading(false));
  }, [connectionId, provider]);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  const onConnect = useCallback(() => {
    const returnTo = Platform.OS !== "web"
      ? `${DEEP_LINK_SCHEME}://integrations`
      : undefined;

    void (async () => {
      try {
        const authorizationUrl = await getIntegrationProviderAuthorizationUrl("google", returnTo);
        await Linking.openURL(authorizationUrl);
      } catch {
        // Keep inspector responsive if OAuth launch fails.
      }
    })();
  }, []);

  const onSelectConnection = useCallback(
    (id: string) => {
      onChange({ integrationConnectionId: id, customLabel: "" });
    },
    [onChange],
  );

  const handleChange = useCallback(
    (patch: Partial<EmailFeedConfig>) => {
      onChange(patch as Record<string, unknown>);
    },
    [onChange],
  );

  return {
    connections,
    labels,
    labelsLoading,
    onConnect,
    onSelectConnection,
    onChange: handleChange,
  };
}
