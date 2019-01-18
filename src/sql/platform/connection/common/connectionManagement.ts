/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { TPromise } from 'vs/base/common/winjs.base';
import { Event } from 'vs/base/common/event';
import { IAction } from 'vs/base/common/actions';
import Severity from 'vs/base/common/severity';
import * as sqlops from 'sqlops';
import { IConnectionProfileGroup, ConnectionProfileGroup } from 'sql/platform/connection/common/connectionProfileGroup';
import { ConnectionProfile } from 'sql/platform/connection/common/connectionProfile';
import { IConnectionProfile } from 'sql/platform/connection/common/interfaces';
import { ConnectionManagementInfo } from './connectionManagementInfo';

export const VIEWLET_ID = 'workbench.view.connections';

/**
 * Options for the actions that could happen after connecting is complete
 */
export interface IConnectionCompletionOptions {
	/**
	 * save the connection to MRU and settings (only save to setting if profile.saveProfile is set to true)
	 */
	saveTheConnection: boolean;

	/**
	 * open the dashboard after connection is complete
	 */
	showDashboard: boolean;

	/**
	 * Parameters to be used if connecting from an editor
	 */
	params: INewConnectionParams;

	/**
	 * Open the connection dialog if connection fails
	 */
	showConnectionDialogOnError: boolean;

	/**
	 * Open the connection firewall rule dialog if connection fails
	 */
	showFirewallRuleOnError: boolean;
}

export interface IConnectionResult {
	connected: boolean;
	errorMessage: string;
	errorCode: number;
	callStack: string;
	errorHandled?: boolean;
	connectionProfile?: IConnectionProfile;
}

export interface IConnectionCallbacks {
	onConnectStart(): void;
	onConnectReject(error?: string): void;
	onConnectSuccess(params?: INewConnectionParams): void;
	onDisconnect(): void;
	onConnectCanceled(): void;
}

export const SERVICE_ID = 'connectionManagementService';

export const IConnectionManagementService = createDecorator<IConnectionManagementService>(SERVICE_ID);

export interface IConnectionManagementService {
	_serviceBrand: any;

	// Event Emitters
	onAddConnectionProfile: Event<IConnectionProfile>;
	onDeleteConnectionProfile: Event<void>;
	onConnect: Event<IConnectionParams>;
	onDisconnect: Event<IConnectionParams>;
	onConnectionChanged: Event<IConnectionParams>;
	onLanguageFlavorChanged: Event<sqlops.DidChangeLanguageFlavorParams>;

	/**
	 * Opens the connection dialog to create new connection
	 */
	showConnectionDialog(params?: INewConnectionParams, model?: IConnectionProfile, connectionResult?: IConnectionResult): Promise<void>;

	/**
	 * Opens the add server group dialog
	 */
	showCreateServerGroupDialog(callbacks?: IServerGroupDialogCallbacks): Promise<void>;

	/**
	 * Opens the edit server group dialog
	 */
	showEditServerGroupDialog(group: ConnectionProfileGroup): Promise<void>;

	/**
	 * Load the password and opens a new connection
	 */
	connect(connection: IConnectionProfile, uri: string, options?: IConnectionCompletionOptions, callbacks?: IConnectionCallbacks): Promise<IConnectionResult>;

	/**
	 * Opens a new connection and save the profile in settings
	 */
	connectAndSaveProfile(connection: IConnectionProfile, uri: string, options?: IConnectionCompletionOptions, callbacks?: IConnectionCallbacks): Promise<IConnectionResult>;

	/**
	 * Finds existing connection for given profile and purpose is any exists.
	 * The purpose is connection by default
	 */
	findExistingConnection(connection: IConnectionProfile, purpose?: 'dashboard' | 'insights' | 'connection'): ConnectionProfile;

	/**
	 * If there's already a connection for given profile and purpose, returns the ownerUri for the connection
	 * otherwise tries to make a connection and returns the owner uri when connection is complete
	 * The purpose is connection by default
	 */
	connectIfNotConnected(connection: IConnectionProfile, purpose?: 'dashboard' | 'insights' | 'connection', saveConnection?: boolean): Promise<string>;

	/**
	 * Adds the successful connection to MRU and send the connection error back to the connection handler for failed connections
	 */
	onConnectionComplete(handle: number, connectionInfoSummary: sqlops.ConnectionInfoSummary): void;

	onIntelliSenseCacheComplete(handle: number, connectionUri: string): void;

	onConnectionChangedNotification(handle: number, changedConnInfo: sqlops.ChangedConnectionInfo);

	getConnectionGroups(providers?: string[]): ConnectionProfileGroup[];

	getRecentConnections(providers?: string[]): ConnectionProfile[];

	clearRecentConnectionsList(): void;

	clearRecentConnection(connectionProfile: IConnectionProfile): void;

	getActiveConnections(providers?: string[]): ConnectionProfile[];

	saveProfileGroup(profile: IConnectionProfileGroup): Promise<string>;

	changeGroupIdForConnectionGroup(source: IConnectionProfileGroup, target: IConnectionProfileGroup): Promise<void>;

	changeGroupIdForConnection(source: ConnectionProfile, targetGroupName: string): Promise<void>;

	deleteConnection(connection: ConnectionProfile): Promise<boolean>;

	deleteConnectionGroup(group: ConnectionProfileGroup): Promise<boolean>;

	getAdvancedProperties(): sqlops.ConnectionOption[];

	getConnectionUri(connectionProfile: IConnectionProfile): string;

	getFormattedUri(uri: string, connectionProfile: IConnectionProfile): string;

	getConnectionUriFromId(connectionId: string): string;

	isConnected(fileUri: string): boolean;

	/**
	 * Returns true if the connection profile is connected
	 */
	isProfileConnected(connectionProfile: IConnectionProfile): boolean;

	/**
	 * Returns true if the connection profile is connecting
	 */
	isProfileConnecting(connectionProfile: IConnectionProfile): boolean;

	isRecent(connectionProfile: ConnectionProfile): boolean;

	isConnected(fileUri: string, connectionProfile?: ConnectionProfile): boolean;

	disconnectEditor(owner: IConnectableInput, force?: boolean): Promise<boolean>;

	disconnect(connection: IConnectionProfile): Promise<void>;

	disconnect(ownerUri: string): Promise<void>;

	addSavedPassword(connectionProfile: IConnectionProfile): Promise<IConnectionProfile>;

	listDatabases(connectionUri: string): Thenable<sqlops.ListDatabasesResult>;

	/**
	 * Register a connection provider
	 */
	registerProvider(providerId: string, provider: sqlops.ConnectionProvider): void;

	editGroup(group: ConnectionProfileGroup): Promise<void>;

	getConnectionProfile(fileUri: string): IConnectionProfile;

	getConnectionInfo(fileUri: string): ConnectionManagementInfo;

	/**
	 * Cancels the connection
	 */
	cancelConnection(connection: IConnectionProfile): Thenable<boolean>;

	/**
	 * Changes the database for an active connection
	 */
	changeDatabase(connectionUri: string, databaseName: string): Thenable<boolean>;

	/**
	 * Cancels the connection for the editor
	 */
	cancelEditorConnection(owner: IConnectableInput): Thenable<boolean>;

	showDashboard(connection: IConnectionProfile): Thenable<boolean>;

	closeDashboard(uri: string): void;

	getProviderIdFromUri(ownerUri: string): string;

	hasRegisteredServers(): boolean;

	canChangeConnectionConfig(profile: IConnectionProfile, newGroupID: string): boolean;

	getTabColorForUri(uri: string): string;

	/**
	 * Sends a notification that the language flavor for a given URI has changed.
	 * For SQL, this would be the specific SQL implementation being used.
	 *
	 * @param {string} uri the URI of the resource whose language has changed
	 * @param {string} language the base language
	 * @param {string} flavor the specific language flavor that's been set
	 *
	 * @memberof IConnectionManagementService
	 */
	doChangeLanguageFlavor(uri: string, language: string, flavor: string): void;

	/**
	 * Ensures that a default language flavor is set for a URI, if none has already been defined.
	 * @param {string} uri document identifier
	 * @memberof ConnectionManagementService
	 */
	ensureDefaultLanguageFlavor(uri: string): void;

	/**
	 * Refresh the IntelliSense cache for the connection with the given URI
	 */
	rebuildIntelliSenseCache(uri: string): Thenable<void>;

	/**
	 * Get a copy of the connection profile with its passwords removed
	 * @param {IConnectionProfile} profile The connection profile to remove passwords from
	 * @returns {IConnectionProfile} A copy of the connection profile with passwords removed
	 */
	removeConnectionProfileCredentials(profile: IConnectionProfile): IConnectionProfile;

	/**
	 * Get the credentials for a connected connection profile, as they would appear in the options dictionary
	 * @param {string} profileId The id of the connection profile to get the password for
	 * @returns {{ [name: string]: string }} A dictionary containing the credentials as they would be included
	 * in the connection profile's options dictionary, or undefined if the profile is not connected
	 */
	getActiveConnectionCredentials(profileId: string): { [name: string]: string };

	/**
	 * Get the connection string for the provided connection ID
	 */
	getConnectionString(connectionId: string, includePassword: boolean): Thenable<string>;

	/**
	 * Serialize connection string with optional provider
	 */
	buildConnectionInfo(connectionString: string, provider?: string): Thenable<sqlops.ConnectionInfo>;
}

export const IConnectionDialogService = createDecorator<IConnectionDialogService>('connectionDialogService');
export interface IConnectionDialogService {
	_serviceBrand: any;
	/**
	 * Opens the connection dialog and returns the promise for successfully opening the dialog
	 * @param connectionManagementService
	 * @param params
	 * @param model
	 * @param connectionResult
	 */
	showDialog(connectionManagementService: IConnectionManagementService, params: INewConnectionParams, model: IConnectionProfile, connectionResult?: IConnectionResult): Thenable<void>;

	/**
	 * Opens the connection dialog and returns the promise when connection is made
	 * or dialog is closed
	 * @param connectionManagementService
	 * @param params
	 * @param model
	 * @param connectionResult
	 */
	openDialogAndWait(connectionManagementService: IConnectionManagementService, params?: INewConnectionParams, model?: IConnectionProfile, connectionResult?: IConnectionResult): Thenable<IConnectionProfile>;
}

export interface IServerGroupDialogCallbacks {
	onAddGroup(groupName: string): void;
	onClose(): void;
}
export const IServerGroupController = createDecorator<IServerGroupController>('serverGroupController');
export interface IServerGroupController {
	_serviceBrand: any;
	showCreateGroupDialog(connectionManagementService: IConnectionManagementService, callbacks?: IServerGroupDialogCallbacks): TPromise<void>;
	showEditGroupDialog(connectionManagementService: IConnectionManagementService, group: ConnectionProfileGroup): TPromise<void>;
}

export enum RunQueryOnConnectionMode {
	none = 0,
	executeQuery = 1,
	executeCurrentQuery = 2,
	estimatedQueryPlan = 3,
	actualQueryPlan = 4
}

export interface INewConnectionParams {
	connectionType: ConnectionType;
	input?: IConnectableInput;
	runQueryOnCompletion?: RunQueryOnConnectionMode;
	querySelection?: sqlops.ISelectionData;
	showDashboard?: boolean;
	providers?: string[];
}

export interface IConnectableInput {
	uri: string;
	onConnectStart(): void;
	onConnectReject(error?: string): void;
	onConnectSuccess(params?: INewConnectionParams): void;
	onDisconnect(): void;
	onConnectCanceled(): void;
}

export enum ConnectionType {
	default = 0,
	editor = 1
}

export enum MetadataType {
	Table = 0,
	View = 1,
	SProc = 2,
	Function = 3
}

export enum TaskStatus {
	NotStarted = 0,
	InProgress = 1,
	Succeeded = 2,
	SucceededWithWarning = 3,
	Failed = 4,
	Canceled = 5,
	Canceling = 6
}

export interface IConnectionParams {
	connectionUri: string;
	connectionProfile: IConnectionProfile;
}