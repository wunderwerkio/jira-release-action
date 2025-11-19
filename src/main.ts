import * as core from "@actions/core";
import * as v from "valibot";
import {
	createJiraClient,
	deleteProjectVersionByName,
	upsertProjectVersion,
} from "./jira.js";
import { InputSchema } from "./schema.js";

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		// Read inputs
		const inputs = {
			email: core.getInput("email", { required: true }),
			api_token: core.getInput("api_token", { required: true }),
			subdomain: core.getInput("subdomain", { required: true }),
			jira_project: core.getInput("jira_project", { required: true }),
			release_name: core.getInput("release_name", { required: true }),
			operation: core.getInput("operation", { required: true }),
			tickets: core.getInput("tickets", { required: false }),
			dry_run: core.getBooleanInput("dry_run", { required: false }),
			release_description: core.getInput("release_description", {
				required: false,
			}),
			release_released: core.getBooleanInput("release_released", {
				required: false,
			}),
			release_release_date: core.getInput("release_release_date", {
				required: false,
			}),
			release_archived: core.getBooleanInput("release_archived", {
				required: false,
			}),
		};

		// Validate inputs
		const input = v.parse(InputSchema, inputs);

		if (input.dry_run) {
			core.info("Dry run enabled, dumping config:");
			core.info(JSON.stringify(input, null, 2));
			return;
		}

		core.info(
			`Performing release operation ${input.operation} on project ${input.jira_project} for release ${input.release_name}...`,
		);
		core.debug(JSON.stringify(input, null, 2));

		const client = await createJiraClient(
			input.email,
			input.api_token,
			input.subdomain,
		);

		if (input.operation === "create_or_update") {
			await upsertProjectVersion(client, input.jira_project, {
				name: input.release_name,
				description: input.release_description,
				released: input.release_released,
				releaseDate: input.release_release_date || undefined,
				archived: input.release_archived,
			});
		} else if (input.operation === "delete") {
			await deleteProjectVersionByName(
				client,
				input.jira_project,
				input.release_name,
			);
		}
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
