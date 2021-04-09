import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  customElement,
  state,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { html } from "lit-html";
import { any, assert, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ServiceAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import { EntityIdOrAll } from "../../../../../common/structs/is-entity-id";
import { ActionElement } from "../ha-automation-action-row";
import "../../../../../components/ha-service-control";
import { hasTemplate } from "../../../../../common/string/has-template";

const actionStruct = object({
  service: optional(string()),
  entity_id: optional(EntityIdOrAll),
  target: optional(any()),
  data: optional(any()),
});

@customElement("ha-automation-action-service")
export class HaServiceAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: ServiceAction;

  @property({ type: Boolean }) public narrow = false;

  @state() private _action!: ServiceAction;

  public static get defaultConfig() {
    return { service: "", data: {} };
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    try {
      assert(this.action, actionStruct);
    } catch (error) {
      fireEvent(this, "ui-mode-not-available", error);
      return;
    }
    if (this.action && hasTemplate(this.action)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
      return;
    }
    if (this.action.entity_id) {
      this._action = {
        ...this.action,
        data: { ...this.action.data, entity_id: this.action.entity_id },
      };
      delete this._action.entity_id;
    } else {
      this._action = this.action;
    }
  }

  protected render() {
    return html`
      <ha-service-control
        .narrow=${this.narrow}
        .hass=${this.hass}
        .value=${this._action}
        .showAdvanced=${this.hass.userData?.showAdvanced}
        @value-changed=${this._actionChanged}
      ></ha-service-control>
    `;
  }

  private _actionChanged(ev) {
    if (ev.detail.value === this._action) {
      ev.stopPropagation();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-service-control {
        display: block;
        margin: 0 -16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-service": HaServiceAction;
  }
}
