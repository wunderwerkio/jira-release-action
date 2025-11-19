import * as core from "@actions/core";
import { Version3Client } from "jira.js";

/**
 * Parameters for upserting a Jira project version.
 */
export interface ProjectVersionUpsertParams {
	name: string;
	description?: string;
	released: boolean;
	releaseDate?: string;
	archived: boolean;
}

/**
 * Creates a Jira client instance using basic authentication.
 *
 * @param email - The email address for authentication.
 * @param apiToken - The API token for authentication.
 * @param subdomain - The Jira subdomain (e.g., 'mycompany').
 * @returns A configured Version3Client instance.
 */
export async function createJiraClient(
	email: string,
	apiToken: string,
	subdomain: string,
) {
	const host = `https://${subdomain}.atlassian.net`;

	return new Version3Client({
		host,
		authentication: {
			basic: {
				email,
				apiToken,
			},
		},
	});
}

/**
 * Retrieves a project version by name from Jira.
 *
 * @param client - The Jira client instance.
 * @param projectKey - The project key.
 * @param name - The version name to search for.
 * @returns The matching version or null if not found.
 */
async function getProjectVersionByName(
	client: Version3Client,
	projectKey: string,
	name: string,
) {
	core.info(`Getting version ${name}...`);

	const versions = await client.projectVersions.getProjectVersionsPaginated({
		projectIdOrKey: projectKey,
		query: name,
	});

	core.debug(JSON.stringify(versions, null, 2));

	return versions.values?.find((v) => v.name === name) || null;
}

/**
 * Deletes a project version by name.
 *
 * @param client - The Jira client instance.
 * @param projectKey - The project key.
 * @param name - The version name to delete.
 * @throws Error if version not found.
 */
export async function deleteProjectVersionByName(
	client: Version3Client,
	projectKey: string,
	name: string,
) {
	const version = await getProjectVersionByName(client, projectKey, name);
	if (!version || !version.id) {
		throw new Error(`Version ${name} not found`);
	}

	core.info(`Deleting version ${name}...`);
	core.debug(JSON.stringify(version, null, 2));

	await client.projectVersions.deleteAndReplaceVersion({
		id: version.id,
	});
}

/**
 * Retrieves the project ID from the project key.
 *
 * @param client - The Jira client instance.
 * @param projectKey - The project key.
 * @returns The project ID as a string.
 */
async function getProjectId(client: Version3Client, projectKey: string) {
	const project = await client.projects.getProject({
		projectIdOrKey: projectKey,
	});

	core.debug(JSON.stringify(project, null, 2));

	return project.id;
}

/**
 * Upserts a project version (creates if not exists, updates if exists).
 *
 * @param client - The Jira client instance.
 * @param projectKey - The project key.
 * @param params - The version parameters.
 * @returns The created or updated version.
 */
export async function upsertProjectVersion(
	client: Version3Client,
	projectKey: string,
	params: ProjectVersionUpsertParams,
) {
	// Make sure the release date is in YYYY-MM-DD format.
	params.releaseDate = params.releaseDate
		? new Date(params.releaseDate).toISOString().split("T")[0]
		: undefined;

	const version = await getProjectVersionByName(
		client,
		projectKey,
		params.name,
	);
	if (version?.id) {
		return await updateProjectVersion(client, version.id, params);
	}

	return await createProjectVersion(client, projectKey, params);
}

/**
 * Creates a new project version.
 *
 * @param client - The Jira client instance.
 * @param projectKey - The project key.
 * @param params - The version parameters.
 * @returns The created version.
 */
async function createProjectVersion(
	client: Version3Client,
	projectKey: string,
	params: ProjectVersionUpsertParams,
) {
	const projectId = await getProjectId(client, projectKey);
	const preparedParams = prepareUpsertParams(params);

	core.info(`Creating project version ${preparedParams.name}...`);
	core.debug(JSON.stringify(preparedParams, null, 2));

	return await client.projectVersions.createVersion({
		...preparedParams,
		projectId,
	});
}

/**
 * Updates an existing project version.
 *
 * @param client - The Jira client instance.
 * @param versionId - The version ID to update.
 * @param params - The version parameters.
 * @returns The updated version.
 */
async function updateProjectVersion(
	client: Version3Client,
	versionId: string,
	params: ProjectVersionUpsertParams,
) {
	const preparedParams = prepareUpsertParams(params);

	core.info(`Updating project version ${preparedParams.name}...`);
	core.debug(JSON.stringify(preparedParams, null, 2));

	return await client.projectVersions.updateVersion({
		...preparedParams,
		id: versionId,
	});
}

/**
 * Prepares parameters for upsert operations, handling release date logic.
 *
 * @param params - The input parameters.
 * @returns Prepared parameters with formatted release date.
 */
function prepareUpsertParams(params: ProjectVersionUpsertParams) {
	// Make sure the release date is set if the release is released.
	if (params.released && !params.releaseDate) {
		params.releaseDate = new Date().toISOString().split("T")[0];
	} else if (!params.released) {
		params.releaseDate = undefined;
	}

	// Make sure the release date is in YYYY-MM-DD format.
	if (params.releaseDate) {
		params.releaseDate = new Date(params.releaseDate)
			.toISOString()
			.split("T")[0];
	}

	return {
		...params,
		releaseDate: params.releaseDate
			? new Date(params.releaseDate).toISOString().split("T")[0]
			: undefined,
	};
}
