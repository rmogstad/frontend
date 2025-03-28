import {
  customElement,
  html,
  css,
  internalProperty,
  LitElement,
  TemplateResult,
  property,
} from "lit-element";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-switch";

import { IntegrationManifest } from "../../../src/data/integration";

import { provideHass } from "../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../src/types";
import "../../../src/panels/config/integrations/ha-integration-card";
import "../../../src/panels/config/integrations/ha-ignored-config-entry-card";
import "../../../src/panels/config/integrations/ha-config-flow-card";
import type {
  ConfigEntryExtended,
  DataEntryFlowProgressExtended,
} from "../../../src/panels/config/integrations/ha-config-integrations";
import { DeviceRegistryEntry } from "../../../src/data/device_registry";
import { EntityRegistryEntry } from "../../../src/data/entity_registry";
import { classMap } from "lit-html/directives/class-map";

const createConfigEntry = (
  title: string,
  override: Partial<ConfigEntryExtended> = {}
): ConfigEntryExtended => ({
  entry_id: title,
  domain: "esphome",
  localized_domain_name: "ESPHome",
  title,
  source: "zeroconf",
  state: "loaded",
  connection_class: "local_push",
  supports_options: false,
  supports_unload: true,
  disabled_by: null,
  reason: null,
  ...override,
});

const createManifest = (
  isCustom: boolean,
  isCloud: boolean,
  name = "ESPHome"
): IntegrationManifest => ({
  name,
  domain: "esphome",
  is_built_in: !isCustom,
  config_flow: false,
  documentation: "https://www.home-assistant.io/integrations/esphome/",
  iot_class: isCloud ? "cloud_polling" : "local_polling",
});

const loadedEntry = createConfigEntry("Loaded");
const nameAsDomainEntry = createConfigEntry("ESPHome");
const longNameEntry = createConfigEntry(
  "Entry with a super long name that is going to the next line"
);
const configPanelEntry = createConfigEntry("Config Panel", {
  domain: "mqtt",
  localized_domain_name: "MQTT",
});
const optionsFlowEntry = createConfigEntry("Options Flow", {
  supports_options: true,
});
const setupErrorEntry = createConfigEntry("Setup Error", {
  state: "setup_error",
});
const migrationErrorEntry = createConfigEntry("Migration Error", {
  state: "migration_error",
});
const setupRetryEntry = createConfigEntry("Setup Retry", {
  state: "setup_retry",
});
const setupRetryReasonEntry = createConfigEntry("Setup Retry", {
  state: "setup_retry",
  reason: "connection_error",
});
const setupRetryReasonMissingKeyEntry = createConfigEntry("Setup Retry", {
  state: "setup_retry",
  reason: "resolve_error",
});
const failedUnloadEntry = createConfigEntry("Failed Unload", {
  state: "failed_unload",
});
const notLoadedEntry = createConfigEntry("Not Loaded", { state: "not_loaded" });
const disabledEntry = createConfigEntry("Disabled", {
  state: "not_loaded",
  disabled_by: "user",
});
const disabledFailedUnloadEntry = createConfigEntry(
  "Disabled - Failed Unload",
  {
    state: "failed_unload",
    disabled_by: "user",
  }
);

const configFlows: DataEntryFlowProgressExtended[] = [
  {
    flow_id: "adbb401329d8439ebb78ef29837826a8",
    handler: "roku",
    context: {
      source: "ssdp",
      unique_id: "YF008D862864",
      title_placeholders: {
        name: "Living room Roku",
      },
    },
    step_id: "discovery_confirm",
    localized_title: "Living room Roku",
  },
  {
    flow_id: "adbb401329d8439ebb78ef29837826a8",
    handler: "hue",
    context: {
      source: "reauth",
      unique_id: "YF008D862864",
      title_placeholders: {
        name: "Living room Roku",
      },
    },
    step_id: "discovery_confirm",
    localized_title: "Philips Hue",
  },
];

const configEntries: Array<{
  items: ConfigEntryExtended[];
  is_custom?: boolean;
  disabled?: boolean;
  highlight?: string;
}> = [
  { items: [loadedEntry] },
  { items: [configPanelEntry] },
  { items: [optionsFlowEntry] },
  { items: [nameAsDomainEntry] },
  { items: [longNameEntry] },
  { items: [setupErrorEntry] },
  { items: [migrationErrorEntry] },
  { items: [setupRetryEntry] },
  { items: [setupRetryReasonEntry] },
  { items: [setupRetryReasonMissingKeyEntry] },
  { items: [failedUnloadEntry] },
  { items: [notLoadedEntry] },
  {
    items: [
      loadedEntry,
      setupErrorEntry,
      migrationErrorEntry,
      longNameEntry,
      setupRetryEntry,
      failedUnloadEntry,
      notLoadedEntry,
      disabledEntry,
      nameAsDomainEntry,
      configPanelEntry,
      optionsFlowEntry,
    ],
  },
  { disabled: true, items: [disabledEntry] },
  { disabled: true, items: [disabledFailedUnloadEntry] },
  {
    disabled: true,
    items: [disabledEntry, disabledFailedUnloadEntry],
  },
  {
    items: [loadedEntry, configPanelEntry],
    highlight: "Loaded",
  },
];

const createEntityRegistryEntries = (
  item: ConfigEntryExtended
): EntityRegistryEntry[] => [
  {
    config_entry_id: item.entry_id,
    device_id: "mock-device-id",
    area_id: null,
    disabled_by: null,
    entity_id: "binary_sensor.updater",
    name: null,
    icon: null,
    platform: "updater",
  },
];

const createDeviceRegistryEntries = (
  item: ConfigEntryExtended
): DeviceRegistryEntry[] => [
  {
    entry_type: null,
    config_entries: [item.entry_id],
    connections: [],
    manufacturer: "ESPHome",
    model: "Mock Device",
    name: "Tag Reader",
    sw_version: null,
    id: "mock-device-id",
    identifiers: [],
    via_device_id: null,
    area_id: null,
    name_by_user: null,
    disabled_by: null,
  },
];

@customElement("demo-integration-card")
export class DemoIntegrationCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @internalProperty() isCustomIntegration = false;

  @internalProperty() isCloud = false;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    return html`
      <div class="container">
        <div class="filters">
          <ha-formfield label="Custom Integration">
            <ha-switch @change=${this._toggleCustomIntegration}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Relies on cloud">
            <ha-switch @change=${this._toggleCloud}></ha-switch>
          </ha-formfield>
        </div>

        <ha-ignored-config-entry-card
          .hass=${this.hass}
          .entry=${createConfigEntry("Ignored Entry")}
          .manifest=${createManifest(this.isCustomIntegration, this.isCloud)}
        ></ha-ignored-config-entry-card>

        ${configFlows.map(
          (flow) => html`
            <ha-config-flow-card
              .hass=${this.hass}
              .flow=${flow}
              .manifest=${createManifest(
                this.isCustomIntegration,
                this.isCloud,
                flow.handler === "roku" ? "Roku" : "Philips Hue"
              )}
            ></ha-config-flow-card>
          `
        )}
        ${configEntries.map(
          (info) => html`
            <ha-integration-card
              class=${classMap({
                highlight: info.highlight !== undefined,
              })}
              .hass=${this.hass}
              domain="esphome"
              .items=${info.items}
              .manifest=${createManifest(
                this.isCustomIntegration,
                this.isCloud
              )}
              .entityRegistryEntries=${createEntityRegistryEntries(
                info.items[0]
              )}
              .deviceRegistryEntries=${createDeviceRegistryEntries(
                info.items[0]
              )}
              ?disabled=${info.disabled}
              .selectedConfigEntryId=${info.highlight}
            ></ha-integration-card>
          `
        )}
      </div>
      <div class="container">
        <!-- One that is standalone to see how it increases height if height
           not defined by other cards. -->
        <ha-integration-card
          .hass=${this.hass}
          domain="esphome"
          .items=${[
            loadedEntry,
            setupErrorEntry,
            migrationErrorEntry,
            setupRetryEntry,
            failedUnloadEntry,
          ]}
          .manifest=${createManifest(this.isCustomIntegration, this.isCloud)}
          .entityRegistryEntries=${createEntityRegistryEntries(loadedEntry)}
          .deviceRegistryEntries=${createDeviceRegistryEntries(loadedEntry)}
        ></ha-integration-card>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    // Normally this string is loaded from backend
    hass.addTranslations(
      {
        "component.esphome.config.error.connection_error":
          "Can't connect to ESP. Please make sure your YAML file contains an 'api:' line.",
      },
      "en"
    );
  }

  private _toggleCustomIntegration() {
    this.isCustomIntegration = !this.isCustomIntegration;
  }

  private _toggleCloud() {
    this.isCloud = !this.isCloud;
  }

  static get styles() {
    return css`
      .container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        grid-gap: 16px 16px;
        padding: 8px 16px 16px;
        margin-bottom: 64px;
      }

      .container > * {
        max-width: 500px;
      }

      ha-formfield {
        margin: 8px 0;
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-integration-card": DemoIntegrationCard;
  }
}
