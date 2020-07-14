import {Board} from "core-app/modules/boards/board/board";
import {QueryResource} from "core-app/modules/hal/resources/query-resource";
import {HalResource} from "core-app/modules/hal/resources/hal-resource";
import {ComponentType} from "@angular/cdk/portal";
import {OpContextMenuItem} from "core-components/op-context-menu/op-context-menu.types";
import {DisabledButtonPlaceholder} from "core-app/modules/boards/board/board-list/board-list.component";
import {CreateAutocompleterComponent} from "core-app/modules/common/autocomplete/create-autocompleter.component";
import {FilterOperator} from "core-components/api/api-v3/api-v3-filter-builder";
import {BoardListsService} from "core-app/modules/boards/board/board-list/board-lists.service";
import {I18nService} from "core-app/modules/common/i18n/i18n.service";
import {HalResourceService} from "core-app/modules/hal/services/hal-resource.service";
import {PathHelperService} from "core-app/modules/common/path-helper/path-helper.service";
import {CurrentProjectService} from "core-components/projects/current-project.service";
import {Injectable, Injector} from "@angular/core";
import {take} from "rxjs/operators";
import {input} from "reactivestates";
import {WorkPackageResource} from "core-app/modules/hal/resources/work-package-resource";
import {IFieldSchema} from "core-app/modules/fields/field.base";
import {WorkPackageChangeset} from "core-components/wp-edit/work-package-changeset";
import {WorkPackageFilterValues} from "core-components/wp-edit-form/work-package-filter-values";

@Injectable()
export abstract class BoardActionService {

  // Cache the available values for the duration of the board
  protected cache = input<HalResource[]>();

  constructor(readonly injector:Injector,
              protected boardListsService:BoardListsService,
              protected I18n:I18nService,
              protected halResourceService:HalResourceService,
              protected pathHelper:PathHelperService,
              protected currentProject:CurrentProjectService) {
  }


  /**
   * Get the attribute name
   */
  localizedName:string;

  /**
   * The action filter name
   */
  actionAttribute:string;

  /**
   * Returns the current filter value ID if any
   * @param query
   * @returns /api/v3/status/:id if a status filter exists
   */
  getFilterHref(query:QueryResource):string|undefined {
    const filter = _.find(query.filters, filter => filter.id === this.actionAttribute);
    if (filter) {
      const value = filter.values[0] as string|HalResource;
      return (value instanceof HalResource) ? value.href! : value;
    }

    return;
  }

  /**
   * Returns the current filter value if any
   * @param query
   * @returns /api/v3/status/:id if a status filter exists
   */
  getLoadedFilterValue(query:QueryResource):Promise<HalResource|undefined> {
    const href = this.getFilterHref(query);

    if (!href) {
      return Promise.resolve(undefined);
    }

    return this
      .withLoadedAvailable()
      .then(collection => collection.find(resource => resource.href === href));
  }

  /**
   * Add initial queries to a new board
   *
   * @param newBoard
   */
  addActionQueries(newBoard:Board):Promise<Board> {
    return Promise.resolve(newBoard);
  }

  /**
   * Add a single action query
   */
  addActionQuery(board:Board, value:HalResource):Promise<Board> {
    let params:any = {
      name: value.name,
    };

    let filter = {
      [this.actionAttribute]: {
        operator: '=' as FilterOperator,
        values: [value.idFromLink]
      }
    };

    return this.boardListsService.addQuery(board, params, [filter]);
  }

  /**
   * Get available values from the active queries
   *
   * @param board The board we're looking at
   * @param active The active set of values (hrefs or plain values)
   */
  getAvailableValues(board:Board, active:Set<string>):Promise<HalResource[]> {
    return this
      .withLoadedAvailable()
      .then(results =>
        results.filter(item => !active.has(item.id!))
      );
  }

  /**
   * Get action specific items that shall be shown in the list menu
   * @returns {any[]}
   */
  getAdditionalListMenuItems(query:QueryResource):Promise<OpContextMenuItem[]> {
    return Promise.resolve([]);
  }

  /**
   * Get the specific component for the autocompleter (e.g versionAutocompleter)
   * @returns {Component}
   */
  autocompleterComponent():ComponentType<unknown> {
    return CreateAutocompleterComponent;
  }

  /**
   * Get the specific header component for the board list, or undefined if none
   * @returns {Component}
   */
  headerComponent():ComponentType<unknown>|undefined {
    return undefined;
  }

  /**
   * Get icon and text to show on the add button when it is disabled
   * @returns {the icon class or nothing}
   */
  disabledAddButtonPlaceholder(resource?:HalResource):DisabledButtonPlaceholder|undefined {
    return undefined;
  }

  /**
   * Determines the specific warning to be shown, when there are no options to add as a list
   * @returns {the text or nothing}
   */
  warningTextWhenNoOptionsAvailable():Promise<string|undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * Determine whether we can drag items into a given query for the
   * selected action value
   *
   * @param query
   * @param value
   */
  dragIntoAllowed(query:QueryResource, value:HalResource|undefined):boolean {
    return true;
  }

  /**
   * Determine whether we can create new items for this action attribute
   */
  canAddToQuery(query:QueryResource):Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Determine whether the given work package can be moved
   */
  canMove(workPackage:WorkPackageResource):boolean {
    const fieldSchema = workPackage.schema[this.actionAttribute] as IFieldSchema;
    return fieldSchema?.writable;
  }

  /**
   * Assign the work package to the action attribute
   */
  assignToWorkPackage(changeset:WorkPackageChangeset, query:QueryResource) {
    // Ensure attribute remains writable in the form
    if (!changeset.isWritable(this.actionAttribute)) {
      throw this.I18n.t(
        'js.boards.error_attribute_not_writable',
        { attribute: changeset.humanName(this.actionAttribute) }
      );
    }

    const filter = new WorkPackageFilterValues(this.injector, changeset, query.filters);
    filter.applyDefaultsFromFilters();
  }

  protected withLoadedAvailable():Promise<HalResource[]> {
    this.cache.putFromPromiseIfPristine(() => this.loadAvailable());

    return this.cache
      .values$()
      .pipe(take(1))
      .toPromise();
  }

  /**
   * Load the available values for this action attribute
   */
  protected abstract loadAvailable():Promise<HalResource[]>;
}
