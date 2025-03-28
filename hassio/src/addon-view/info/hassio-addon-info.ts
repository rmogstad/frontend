import "@material/mwc-button";
import {
  mdiArrowUpBoldCircle,
  mdiCheckCircle,
  mdiChip,
  mdiCircle,
  mdiCursorDefaultClickOutline,
  mdiDocker,
  mdiExclamationThick,
  mdiFlask,
  mdiHomeAssistant,
  mdiKey,
  mdiNetwork,
  mdiPound,
  mdiShield,
} from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../../src/common/config/version";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { navigate } from "../../../../src/common/navigate";
import "../../../../src/components/buttons/ha-call-api-button";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-label-badge";
import "../../../../src/components/ha-markdown";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import {
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
  installHassioAddon,
  restartHassioAddon,
  setHassioAddonOption,
  setHassioAddonSecurity,
  startHassioAddon,
  stopHassioAddon,
  uninstallHassioAddon,
  updateHassioAddon,
  validateHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../../src/data/hassio/common";
import { StoreAddon } from "../../../../src/data/supervisor/store";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { bytesToString } from "../../../../src/util/bytes-to-string";
import "../../components/hassio-card-content";
import "../../components/supervisor-metric";
import { showHassioMarkdownDialog } from "../../dialogs/markdown/show-dialog-hassio-markdown";
import { showDialogSupervisorUpdate } from "../../dialogs/update/show-dialog-update";
import { hassioStyle } from "../../resources/hassio-style";
import { addonArchIsSupported } from "../../util/addon";

const STAGE_ICON = {
  stable: mdiCheckCircle,
  experimental: mdiFlask,
  deprecated: mdiExclamationThick,
};

@customElement("hassio-addon-info")
class HassioAddonInfo extends LitElement {
  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @internalProperty() private _metrics?: HassioStats;

  @internalProperty() private _error?: string;

  private _addonStoreInfo = memoizeOne(
    (slug: string, storeAddons: StoreAddon[]) =>
      storeAddons.find((addon) => addon.slug === slug)
  );

  protected render(): TemplateResult {
    const addonStoreInfo =
      !this.addon.detached && !this.addon.available
        ? this._addonStoreInfo(this.addon.slug, this.supervisor.store.addons)
        : undefined;
    const metrics = [
      {
        description: this.supervisor.localize("addon.dashboard.cpu_usage"),
        value: this._metrics?.cpu_percent,
      },
      {
        description: this.supervisor.localize("addon.dashboard.ram_usage"),
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];
    return html`
      ${this.addon.update_available
        ? html`
            <ha-card
              .header="${this.supervisor.localize(
                "common.update_available",
                "count",
                1
              )}🎉"
            >
              <div class="card-content">
                <hassio-card-content
                  .hass=${this.hass}
                  .title="${this.supervisor.localize(
                    "addon.dashboard.new_update_available",
                    "name",
                    this.addon.name,
                    "version",
                    this.addon.version_latest
                  )}"
                  .description="${this.supervisor.localize(
                    "common.running_version",
                    "version",
                    this.addon.version
                  )}"
                  icon=${mdiArrowUpBoldCircle}
                  iconClass="update"
                ></hassio-card-content>
                ${!this.addon.available && addonStoreInfo
                  ? !addonArchIsSupported(
                      this.supervisor.info.supported_arch,
                      this.addon.arch
                    )
                    ? html`
                        <p class="warning">
                          ${this.supervisor.localize(
                            "addon.dashboard.not_available_arch"
                          )}
                        </p>
                      `
                    : html`
                        <p class="warning">
                          ${this.supervisor.localize(
                            "addon.dashboard.not_available_arch",
                            "core_version_installed",
                            this.supervisor.core.version,
                            "core_version_needed",
                            addonStoreInfo.homeassistant
                          )}
                        </p>
                      `
                  : ""}
              </div>
              <div class="card-actions">
                <mwc-button @click=${this._updateClicked}>
                  ${this.supervisor.localize("common.update")}
                </mwc-button>
                ${this.addon.changelog
                  ? html`
                      <mwc-button @click=${this._openChangelog}>
                        ${this.supervisor.localize("addon.dashboard.changelog")}
                      </mwc-button>
                    `
                  : ""}
              </div>
            </ha-card>
          `
        : ""}
      ${!this.addon.protected
        ? html`
        <ha-card class="warning">
          <h1 class="card-header">${this.supervisor.localize(
            "addon.dashboard.protection_mode.title"
          )}
          </h1>
          <div class="card-content">
          ${this.supervisor.localize("addon.dashboard.protection_mode.content")}
          </div>
          <div class="card-actions protection-enable">
              <mwc-button @click=${this._protectionToggled}>
              ${this.supervisor.localize(
                "addon.dashboard.protection_mode.enable"
              )}
              </mwc-button>
            </div>
          </div>
        </ha-card>
      `
        : ""}

      <ha-card>
        <div class="card-content">
          <div class="addon-header">
            ${!this.narrow ? this.addon.name : ""}
            <div class="addon-version light-color">
              ${this.addon.version
                ? html`
                    ${this._computeIsRunning
                      ? html`
                          <ha-svg-icon
                            .title=${this.supervisor.localize(
                              "dashboard.addon_running"
                            )}
                            class="running"
                            .path=${mdiCircle}
                          ></ha-svg-icon>
                        `
                      : html`
                          <ha-svg-icon
                            .title=${this.supervisor.localize(
                              "dashboard.addon_stopped"
                            )}
                            class="stopped"
                            .path=${mdiCircle}
                          ></ha-svg-icon>
                        `}
                  `
                : html` ${this.addon.version_latest} `}
            </div>
          </div>
          <div class="description light-color">
            ${this.addon.version
              ? html`
                  Current version: ${this.addon.version}
                  <div class="changelog" @click=${this._openChangelog}>
                    (<span class="changelog-link"
                      >${this.supervisor.localize(
                        "addon.dashboard.changelog"
                      )}</span
                    >)
                  </div>
                `
              : html`<span class="changelog-link" @click=${this._openChangelog}
                  >${this.supervisor.localize(
                    "addon.dashboard.changelog"
                  )}</span
                >`}
          </div>

          <div class="description light-color">
            ${this.addon.description}.<br />
            ${this.supervisor.localize(
              "addon.dashboard.visit_addon_page",
              "name",
              html`<a
                href="${this.addon.url!}"
                target="_blank"
                rel="noreferrer"
              >
                ${this.addon.name}
              </a>`
            )}
          </div>
          <div class="addon-container">
            <div>
              ${this.addon.logo
                ? html`
                    <img
                      class="logo"
                      src="/api/hassio/addons/${this.addon.slug}/logo"
                    />
                  `
                : ""}
              <div class="security">
                ${this.addon.stage !== "stable"
                  ? html` <ha-label-badge
                      class=${classMap({
                        yellow: this.addon.stage === "experimental",
                        red: this.addon.stage === "deprecated",
                      })}
                      @click=${this._showMoreInfo}
                      id="stage"
                      .label=${this.supervisor.localize(
                        "addon.dashboard.capability.label.stage"
                      )}
                      description=""
                    >
                      <ha-svg-icon
                        .path=${STAGE_ICON[this.addon.stage]}
                      ></ha-svg-icon>
                    </ha-label-badge>`
                  : ""}

                <ha-label-badge
                  class=${classMap({
                    green: [5, 6].includes(Number(this.addon.rating)),
                    yellow: [3, 4].includes(Number(this.addon.rating)),
                    red: [1, 2].includes(Number(this.addon.rating)),
                  })}
                  @click=${this._showMoreInfo}
                  id="rating"
                  .value=${this.addon.rating}
                  label="rating"
                  description=""
                ></ha-label-badge>
                ${this.addon.host_network
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="host_network"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.host"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiNetwork}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.full_access
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="full_access"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.hardware"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiChip}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.homeassistant_api
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="homeassistant_api"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.hass"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this._computeHassioApi
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="hassio_api"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.hassio"
                        )}
                        .description=${this.supervisor.localize(
                          `addon.dashboard.capability.role.${this.addon.hassio_role}`
                        ) || this.addon.hassio_role}
                      >
                        <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.docker_api
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="docker_api"
                        .label=".${this.supervisor.localize(
                          "addon.dashboard.capability.label.docker"
                        )}"
                        description=""
                      >
                        <ha-svg-icon .path=${mdiDocker}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.host_pid
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="host_pid"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.host_pid"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiPound}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.apparmor
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        class=${this._computeApparmorClassName}
                        id="apparmor"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.apparmor"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiShield}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.auth_api
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="auth_api"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.auth"
                        )}
                        description=""
                      >
                        <ha-svg-icon .path=${mdiKey}></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
                ${this.addon.ingress
                  ? html`
                      <ha-label-badge
                        @click=${this._showMoreInfo}
                        id="ingress"
                        .label=${this.supervisor.localize(
                          "addon.dashboard.capability.label.ingress"
                        )}
                        description=""
                      >
                        <ha-svg-icon
                          .path=${mdiCursorDefaultClickOutline}
                        ></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
              </div>

              ${this.addon.version
                ? html`
                    <div
                      class="${classMap({
                        "addon-options": true,
                        started: this.addon.state === "started",
                      })}"
                    >
                      <ha-settings-row ?three-line=${this.narrow}>
                        <span slot="heading">
                          ${this.supervisor.localize(
                            "addon.dashboard.option.boot.title"
                          )}
                        </span>
                        <span slot="description">
                          ${this.supervisor.localize(
                            "addon.dashboard.option.boot.description"
                          )}
                        </span>
                        <ha-switch
                          @change=${this._startOnBootToggled}
                          .checked=${this.addon.boot === "auto"}
                          haptic
                        ></ha-switch>
                      </ha-settings-row>

                      ${this.addon.startup !== "once"
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.watchdog.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.watchdog.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._watchdogToggled}
                                .checked=${this.addon.watchdog}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                      ${this.addon.auto_update ||
                      this.hass.userData?.showAdvanced
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.auto_update.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.auto_update.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._autoUpdateToggled}
                                .checked=${this.addon.auto_update}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                      ${!this._computeCannotIngressSidebar && this.addon.ingress
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.ingress_panel.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.ingress_panel.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._panelToggled}
                                .checked=${this.addon.ingress_panel}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                      ${this._computeUsesProtectedOptions
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.protected.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.protected.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._protectionToggled}
                                .checked=${this.addon.protected}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                    </div>
                  `
                : ""}
            </div>
            <div>
              ${this.addon.state === "started"
                ? html`<ha-settings-row ?three-line=${this.narrow}>
                      <span slot="heading">
                        ${this.supervisor.localize("addon.dashboard.hostname")}
                      </span>
                      <code slot="description">
                        ${this.addon.hostname}
                      </code>
                    </ha-settings-row>
                    ${metrics.map(
                      (metric) =>
                        html`
                          <supervisor-metric
                            .description=${metric.description}
                            .value=${metric.value ?? 0}
                            .tooltip=${metric.tooltip}
                          ></supervisor-metric>
                        `
                    )}`
                : ""}
            </div>
          </div>
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          ${!this.addon.version && addonStoreInfo && !this.addon.available
            ? !addonArchIsSupported(
                this.supervisor.info.supported_arch,
                this.addon.arch
              )
              ? html`
                  <p class="warning">
                    ${this.supervisor.localize(
                      "addon.dashboard.not_available_arch"
                    )}
                  </p>
                `
              : html`
                  <p class="warning">
                    ${this.supervisor.localize(
                      "addon.dashboard.not_available_version",
                      "core_version_installed",
                      this.supervisor.core.version,
                      "core_version_needed",
                      addonStoreInfo!.homeassistant
                    )}
                  </p>
                `
            : ""}
        </div>
        <div class="card-actions">
          <div>
            ${this.addon.version
              ? this._computeIsRunning
                ? html`
                    <ha-progress-button
                      class="warning"
                      @click=${this._stopClicked}
                    >
                      ${this.supervisor.localize("addon.dashboard.stop")}
                    </ha-progress-button>
                    <ha-progress-button
                      class="warning"
                      @click=${this._restartClicked}
                    >
                      ${this.supervisor.localize("addon.dashboard.restart")}
                    </ha-progress-button>
                  `
                : html`
                    <ha-progress-button @click=${this._startClicked}>
                      ${this.supervisor.localize("addon.dashboard.start")}
                    </ha-progress-button>
                  `
              : html`
                  <ha-progress-button
                    .disabled=${!this.addon.available}
                    @click=${this._installClicked}
                  >
                    ${this.supervisor.localize("addon.dashboard.install")}
                  </ha-progress-button>
                `}
          </div>
          <div>
            ${this.addon.version
              ? html` ${this._computeShowWebUI
                    ? html`
                        <a
                          href=${this._pathWebui!}
                          tabindex="-1"
                          target="_blank"
                          rel="noopener"
                        >
                          <mwc-button>
                            ${this.supervisor.localize(
                              "addon.dashboard.open_web_ui"
                            )}
                          </mwc-button>
                        </a>
                      `
                    : ""}
                  ${this._computeShowIngressUI
                    ? html`
                        <mwc-button @click=${this._openIngress}>
                          ${this.supervisor.localize(
                            "addon.dashboard.open_web_ui"
                          )}
                        </mwc-button>
                      `
                    : ""}
                  <ha-progress-button
                    class="warning"
                    @click=${this._uninstallClicked}
                  >
                    ${this.supervisor.localize("addon.dashboard.uninstall")}
                  </ha-progress-button>
                  ${this.addon.build
                    ? html`
                        <ha-call-api-button
                          class="warning"
                          .hass=${this.hass}
                          .path="hassio/addons/${this.addon.slug}/rebuild"
                        >
                          ${this.supervisor.localize("addon.dashboard.rebuild")}
                        </ha-call-api-button>
                      `
                    : ""}`
              : ""}
          </div>
        </div>
      </ha-card>

      ${this.addon.long_description
        ? html`
            <ha-card>
              <div class="card-content">
                <ha-markdown
                  .content=${this.addon.long_description}
                ></ha-markdown>
              </div>
            </ha-card>
          `
        : ""}
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("addon")) {
      this._loadData();
    }
  }

  private async _loadData(): Promise<void> {
    if (this.addon.state === "started") {
      this._metrics = await fetchHassioStats(
        this.hass,
        `addons/${this.addon.slug}`
      );
    }
  }

  private get _computeHassioApi(): boolean {
    return (
      this.addon.hassio_api &&
      (this.addon.hassio_role === "manager" ||
        this.addon.hassio_role === "admin")
    );
  }

  private get _computeApparmorClassName(): string {
    if (this.addon.apparmor === "profile") {
      return "green";
    }
    if (this.addon.apparmor === "disable") {
      return "red";
    }
    return "";
  }

  private _showMoreInfo(ev): void {
    const id = ev.currentTarget.id;
    showHassioMarkdownDialog(this, {
      title: this.supervisor.localize(`addon.dashboard.capability.${id}.title`),
      content:
        id === "stage"
          ? this.supervisor.localize(
              `addon.dashboard.capability.${id}.description`,
              "icon_stable",
              `<ha-svg-icon path="${STAGE_ICON.stable}"></ha-svg-icon>`,
              "icon_experimental",
              `<ha-svg-icon path="${STAGE_ICON.experimental}"></ha-svg-icon>`,
              "icon_deprecated",
              `<ha-svg-icon path="${STAGE_ICON.deprecated}"></ha-svg-icon>`
            )
          : this.supervisor.localize(
              `addon.dashboard.capability.${id}.description`
            ),
    });
  }

  private get _computeIsRunning(): boolean {
    return this.addon?.state === "started";
  }

  private get _pathWebui(): string | null {
    return (
      this.addon.webui &&
      this.addon.webui.replace("[HOST]", document.location.hostname)
    );
  }

  private get _computeShowWebUI(): boolean | "" | null {
    return !this.addon.ingress && this.addon.webui && this._computeIsRunning;
  }

  private _openIngress(): void {
    navigate(this, `/hassio/ingress/${this.addon.slug}`);
  }

  private get _computeShowIngressUI(): boolean {
    return this.addon.ingress && this._computeIsRunning;
  }

  private get _computeCannotIngressSidebar(): boolean {
    return (
      !this.addon.ingress || !atLeastVersion(this.hass.config.version, 0, 92)
    );
  }

  private get _computeUsesProtectedOptions(): boolean {
    return (
      this.addon.docker_api || this.addon.full_access || this.addon.host_pid
    );
  }

  private async _startOnBootToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      boot: this.addon.boot === "auto" ? "manual" : "auto",
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _watchdogToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      watchdog: !this.addon.watchdog,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _autoUpdateToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      auto_update: !this.addon.auto_update,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _protectionToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetSecurityParams = {
      protected: !this.addon.protected,
    };
    try {
      await setHassioAddonSecurity(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "security",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _panelToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      ingress_panel: !this.addon.ingress_panel,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _openChangelog(): Promise<void> {
    try {
      const content = await fetchHassioAddonChangelog(
        this.hass,
        this.addon.slug
      );
      showHassioMarkdownDialog(this, {
        title: this.supervisor.localize("addon.dashboard.changelog"),
        content,
      });
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "addon.dashboard.action_error.get_changelog"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _installClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await installHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "install",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.install"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _stopClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await stopHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "stop",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.stop"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _restartClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await restartHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "stop",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.restart"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _updateClicked(): Promise<void> {
    showDialogSupervisorUpdate(this, {
      supervisor: this.supervisor,
      name: this.addon.name,
      version: this.addon.version_latest,
      snapshotParams: {
        name: `addon_${this.addon.slug}_${this.addon.version}`,
        addons: [this.addon.slug],
        homeassistant: false,
      },
      updateHandler: async () => await this._updateAddon(),
    });
  }

  private async _updateAddon(): Promise<void> {
    await updateHassioAddon(this.hass, this.addon.slug);
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "addon",
    });
    const eventdata = {
      success: true,
      response: undefined,
      path: "update",
    };
    fireEvent(this, "hass-api-called", eventdata);
  }

  private async _startClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;
    try {
      const validate = await validateHassioAddonOption(
        this.hass,
        this.addon.slug
      );
      if (!validate.valid) {
        await showConfirmationDialog(this, {
          title: this.supervisor.localize(
            "addon.dashboard.action_error.start_invalid_config"
          ),
          text: validate.message.split(" Got ")[0],
          confirm: () => this._openConfiguration(),
          confirmText: this.supervisor.localize(
            "addon.dashboard.action_error.go_to_config"
          ),
          dismissText: this.supervisor.localize("common.cancel"),
        });
        button.progress = false;
        return;
      }
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to validate addon configuration",
        text: extractApiErrorMessage(err),
      });
      button.progress = false;
      return;
    }

    try {
      await startHassioAddon(this.hass, this.addon.slug);
      this.addon = await fetchHassioAddonInfo(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "start",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.start"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private _openConfiguration(): void {
    navigate(this, `/hassio/addon/${this.addon.slug}/config`);
  }

  private async _uninstallClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.addon.name,
      text: "Are you sure you want to uninstall this add-on?",
      confirmText: "uninstall add-on",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    this._error = undefined;
    try {
      await uninstallHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "uninstall",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "addon.dashboard.action_error.uninstall"
        ),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          display: block;
          margin-bottom: 16px;
        }
        ha-card.warning {
          background-color: var(--error-color);
          color: white;
        }
        ha-card.warning .card-header {
          color: white;
        }
        ha-card.warning .card-content {
          color: white;
        }
        ha-card.warning mwc-button {
          --mdc-theme-primary: white !important;
        }
        .warning {
          color: var(--error-color);
          --mdc-theme-primary: var(--error-color);
        }
        .light-color {
          color: var(--secondary-text-color);
        }
        .addon-header {
          padding-left: 8px;
          font-size: 24px;
          color: var(--ha-card-header-color, --primary-text-color);
        }
        .addon-version {
          float: right;
          font-size: 15px;
          vertical-align: middle;
        }
        .errors {
          color: var(--error-color);
          margin-bottom: 16px;
        }
        .description {
          margin-bottom: 16px;
        }
        img.logo {
          max-height: 60px;
          margin: 16px 0;
          display: block;
        }

        ha-switch {
          display: flex;
        }
        ha-svg-icon.running {
          color: var(--paper-green-400);
        }
        ha-svg-icon.stopped {
          color: var(--google-red-300);
        }
        ha-call-api-button {
          font-weight: 500;
          color: var(--primary-color);
        }
        protection-enable mwc-button {
          --mdc-theme-primary: white;
        }
        .description a {
          color: var(--primary-color);
        }
        .red {
          --ha-label-badge-color: var(--label-badge-red, #df4c1e);
        }
        .blue {
          --ha-label-badge-color: var(--label-badge-blue, #039be5);
        }
        .green {
          --ha-label-badge-color: var(--label-badge-green, #0da035);
        }
        .yellow {
          --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
        }
        .security {
          margin-bottom: 16px;
        }
        .card-actions {
          justify-content: space-between;
          display: flex;
        }
        .security h3 {
          margin-bottom: 8px;
          font-weight: normal;
        }
        .security ha-label-badge {
          cursor: pointer;
          margin-right: 4px;
          --ha-label-badge-padding: 8px 0 0 0;
        }
        .changelog {
          display: contents;
        }
        .changelog-link {
          color: var(--primary-color);
          text-decoration: underline;
          cursor: pointer;
        }
        ha-markdown {
          padding: 16px;
        }
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row > span[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
        }
        ha-settings-row[three-line] {
          height: 74px;
        }

        .addon-options {
          max-width: 90%;
        }

        .addon-container {
          display: grid;
          grid-auto-flow: column;
          grid-template-columns: 60% 40%;
        }

        .addon-container > div:last-of-type {
          align-self: end;
        }

        @media (max-width: 720px) {
          .addon-options {
            max-width: 100%;
          }
          .addon-container {
            display: block;
          }
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-info": HassioAddonInfo;
  }
}
