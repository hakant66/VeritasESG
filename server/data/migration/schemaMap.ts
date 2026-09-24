/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical registry that maps each MongoDB collection / API resource to its
 * relational target and describes the shape needed for a clean migration:
 *
 *  - `resource`        the key used by the generic `/api/db/:resource` API and
 *                      the Prisma model (camelCase singular is the Prisma model,
 *                      the resource key is what the frontend sends).
 *  - `collection`      the physical MongoDB collection name (lowercase).
 *  - `prismaModel`     the Prisma model name (PascalCase).
 *  - `references`      scalar fields that hold the id of another collection.
 *                      Used by the Phase 0 audit (dangling-ref detection) and by
 *                      the Phase 6 ETL (canonical-id remapping).
 *  - `arrayReferences` array fields of ids (e.g. `domainIds`, `questionIds`).
 *  - `jsonFields`      embedded objects/arrays stored as `Json` columns.
 *  - `uniqueKeys`      logical unique constraints (single or composite).
 *
 * This is the single source of truth shared by the audit script, the ETL runner
 * and the SQL repositories so they never drift.
 */

export interface ReferenceSpec {
  /** Field on this collection holding the foreign id. */
  field: string;
  /** Resource key of the referenced collection (see RESOURCE_KEYS). */
  target: string;
  /** When true, orphaned/dangling values are tolerated (dirty legacy data). */
  soft?: boolean;
}

export interface CollectionSpec {
  resource: string;
  collection: string;
  prismaModel: string;
  references: ReferenceSpec[];
  arrayReferences: ReferenceSpec[];
  jsonFields: string[];
  uniqueKeys: string[][];
  /**
   * Mongo documents missing any of these fields after transform are skipped by
   * ETL (e.g. GFANZ pathway templates stored in climatescenarios without projectId).
   * Validation compares SQL count to the migratable Mongo subset only.
   */
  etlRequiredFields?: string[];
  /** SQL-only catalog rows to exclude from parity counts (e.g. boot-seeded GFANZ pathways). */
  etlExcludeFieldValues?: Record<string, string[]>;
}

/** Mongo filter for documents that should be migrated / counted in validation. */
export function mongoEtlFilter(spec: CollectionSpec): Record<string, unknown> {
  if (!spec.etlRequiredFields?.length) return {};
  const clauses = spec.etlRequiredFields.map((field) => ({
    [field]: { $exists: true, $ne: null },
  }));
  return clauses.length === 1 ? clauses[0]! : { $and: clauses };
}

/** Prisma where clause matching the migratable subset (same rules as mongoEtlFilter). */
export function sqlEtlCountWhere(spec: CollectionSpec): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];
  if (spec.etlRequiredFields?.length) {
    for (const field of spec.etlRequiredFields) {
      and.push({ [field]: { not: '' } });
    }
  }
  if (spec.etlExcludeFieldValues) {
    for (const [field, values] of Object.entries(spec.etlExcludeFieldValues)) {
      if (values.length > 0) and.push({ [field]: { notIn: values } });
    }
  }
  if (and.length === 0) return {};
  if (and.length === 1) return and[0]!;
  return { AND: and };
}

/**
 * Ordered so that a dependency always appears before the collections that
 * reference it. The ETL loads in this order to satisfy foreign keys.
 */
export const SCHEMA_MAP: CollectionSpec[] = [
  {
    resource: 'platformUsers',
    collection: 'platformusers',
    prismaModel: 'PlatformUser',
    references: [{ field: 'customerId', target: 'customers', soft: true }, { field: 'contactId', target: 'contacts', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['email']],
  },
  {
    resource: 'segments',
    collection: 'segments',
    prismaModel: 'Segment',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'domains',
    collection: 'domains',
    prismaModel: 'Domain',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['name']],
  },
  {
    resource: 'customers',
    collection: 'customers',
    prismaModel: 'Customer',
    references: [],
    arrayReferences: [{ field: 'sectorIds', target: 'segments', soft: true }],
    jsonFields: ['esgSummary', 'materialityAssessment'],
    uniqueKeys: [],
  },
  {
    resource: 'branches',
    collection: 'branches',
    prismaModel: 'Branch',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'contacts',
    collection: 'contacts',
    prismaModel: 'Contact',
    references: [{ field: 'customerId', target: 'customers' }, { field: 'branchId', target: 'branches', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'templates',
    collection: 'templates',
    prismaModel: 'Template',
    references: [{ field: 'sectorId', target: 'segments', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'templatePages',
    collection: 'templatepages',
    prismaModel: 'TemplatePage',
    references: [{ field: 'templateId', target: 'templates' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'questions',
    collection: 'questions',
    prismaModel: 'Question',
    references: [
      { field: 'templateId', target: 'templates' },
      { field: 'sectorId', target: 'segments', soft: true },
      { field: 'pageId', target: 'templatePages', soft: true },
    ],
    arrayReferences: [{ field: 'domainIds', target: 'domains', soft: true }],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'projects',
    collection: 'projects',
    prismaModel: 'Project',
    references: [{ field: 'customerId', target: 'customers' }, { field: 'templateId', target: 'templates', soft: true }],
    arrayReferences: [{ field: 'domainIds', target: 'domains', soft: true }],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'projectPages',
    collection: 'projectpages',
    prismaModel: 'ProjectPage',
    references: [
      { field: 'projectId', target: 'projects' },
      { field: 'sourceTemplatePageId', target: 'templatePages', soft: true },
    ],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'projectQuestions',
    collection: 'projectquestions',
    prismaModel: 'ProjectQuestion',
    references: [
      { field: 'projectId', target: 'projects' },
      { field: 'sourceQuestionId', target: 'questions', soft: true },
      { field: 'sourceTemplateId', target: 'templates', soft: true },
      { field: 'sectorId', target: 'segments', soft: true },
      { field: 'pageId', target: 'projectPages', soft: true },
    ],
    arrayReferences: [{ field: 'domainIds', target: 'domains', soft: true }],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'projectUserAssignments',
    collection: 'projectuserassignments',
    prismaModel: 'ProjectUserAssignment',
    references: [{ field: 'projectId', target: 'projects' }, { field: 'userId', target: 'platformUsers', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['projectId', 'userId']],
  },
  {
    resource: 'assignments',
    collection: 'assignments',
    prismaModel: 'Assignment',
    references: [
      { field: 'projectId', target: 'projects' },
      { field: 'recipientId', target: 'contacts', soft: true },
      { field: 'assignedBy', target: 'platformUsers', soft: true },
      { field: 'assigneeNoticeSentByUserId', target: 'platformUsers', soft: true },
    ],
    arrayReferences: [{ field: 'questionIds', target: 'projectQuestions', soft: true }],
    jsonFields: ['assigneeNoticeItems'],
    uniqueKeys: [],
  },
  {
    resource: 'answers',
    collection: 'answers',
    prismaModel: 'Answer',
    references: [
      { field: 'assignmentId', target: 'assignments', soft: true },
      { field: 'questionId', target: 'projectQuestions', soft: true },
      { field: 'projectId', target: 'projects' },
      { field: 'contactId', target: 'contacts', soft: true },
      { field: 'submittedByUserId', target: 'platformUsers', soft: true },
      { field: 'onBehalfOfUserId', target: 'platformUsers', soft: true },
    ],
    arrayReferences: [],
    jsonFields: ['answerNotes', 'workflowStatusLog', 'reviewComments'],
    uniqueKeys: [['projectId', 'questionId', 'contactId']],
  },
  {
    resource: 'answerVersions',
    collection: 'answerversions',
    prismaModel: 'AnswerVersion',
    references: [{ field: 'answerId', target: 'answers', soft: true }, { field: 'questionId', target: 'projectQuestions', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'commentMessages',
    collection: 'commentmessages',
    prismaModel: 'CommentMessage',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'otpCodes',
    collection: 'otpcodes',
    prismaModel: 'OtpCode',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['email']],
  },
  {
    resource: 'aiDrafts',
    collection: 'aidrafts',
    prismaModel: 'AIDraft',
    references: [{ field: 'projectPageId', target: 'projectPages', soft: true }, { field: 'approvedBy', target: 'platformUsers', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'auditLogs',
    collection: 'auditlogs',
    prismaModel: 'AuditLog',
    references: [{ field: 'userId', target: 'platformUsers', soft: true }, { field: 'projectId', target: 'projects', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'knowledgeBases',
    collection: 'knowledgebases',
    prismaModel: 'KnowledgeBase',
    references: [
      { field: 'domainId', target: 'domains', soft: true },
      { field: 'projectId', target: 'projects', soft: true },
      { field: 'customerId', target: 'customers', soft: true },
    ],
    arrayReferences: [{ field: 'domainIds', target: 'domains', soft: true }],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'kbDocuments',
    collection: 'kbdocuments',
    prismaModel: 'KBDocument',
    references: [{ field: 'kbId', target: 'knowledgeBases' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'kbIngestJobs',
    collection: 'kbingestjobs',
    prismaModel: 'KbIngestJob',
    references: [{ field: 'documentId', target: 'kbDocuments', soft: true }, { field: 'kbId', target: 'knowledgeBases', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'kbChunks',
    collection: 'kbchunks',
    prismaModel: 'KbChunk',
    references: [
      { field: 'kbId', target: 'knowledgeBases', soft: true },
      { field: 'documentId', target: 'kbDocuments', soft: true },
      { field: 'customerId', target: 'customers', soft: true },
      { field: 'projectId', target: 'projects', soft: true },
    ],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['documentId', 'chunkIndex']],
  },
  {
    resource: 'translations',
    collection: 'translations',
    prismaModel: 'Translation',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['key']],
  },
  {
    resource: 'emailSettings',
    collection: 'emailsettings',
    prismaModel: 'EmailSettings',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'appSettings',
    collection: 'appsettings',
    prismaModel: 'AppSetting',
    references: [],
    arrayReferences: [],
    jsonFields: ['data'],
    uniqueKeys: [['key']],
  },
  {
    resource: 'scheduledJobs',
    collection: 'scheduledjobs',
    prismaModel: 'ScheduledJob',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'emissionFactors',
    collection: 'emissionfactors',
    prismaModel: 'EmissionFactor',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['name']],
  },
  {
    resource: 'emissionEntries',
    collection: 'emissionentries',
    prismaModel: 'EmissionEntry',
    references: [{ field: 'customerId', target: 'customers' }, { field: 'emissionFactorId', target: 'emissionFactors', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'emissionIntensityInputs',
    collection: 'emissionintensityinputs',
    prismaModel: 'EmissionIntensityInput',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year']],
  },
  {
    resource: 'scope2MarketData',
    collection: 'scope2marketdatas',
    prismaModel: 'Scope2MarketData',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year']],
  },
  {
    resource: 'metricDefinitions',
    collection: 'metricdefinitions',
    prismaModel: 'MetricDefinition',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['code']],
  },
  {
    resource: 'metricEntries',
    collection: 'metricentries',
    prismaModel: 'MetricEntry',
    references: [
      { field: 'customerId', target: 'customers' },
      { field: 'metricDefinitionId', target: 'metricDefinitions', soft: true },
      { field: 'ownerUserId', target: 'platformUsers', soft: true },
      { field: 'emissionEntryId', target: 'emissionEntries', soft: true },
    ],
    arrayReferences: [],
    jsonFields: ['approvalStatusLog'],
    uniqueKeys: [['customerId', 'year', 'metricDefinitionCode', 'facilityId']],
  },
  {
    resource: 'materialityTopics',
    collection: 'materialitytopics',
    prismaModel: 'MaterialityTopic',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year', 'esrsId']],
  },
  {
    resource: 'materialityAssessments',
    collection: 'materialityassessments',
    prismaModel: 'MaterialityAssessment',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: ['materialTopics'],
    uniqueKeys: [['customerId', 'year']],
  },
  {
    resource: 'griMaterialityMatrixRows',
    collection: 'grimaterialitymatricesrow',
    prismaModel: 'GRIMaterialityMatrixRow',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [],
  },
  {
    resource: 'griAssessmentScores',
    collection: 'griassessmentscores',
    prismaModel: 'GRIAssessmentScore',
    references: [{ field: 'customerId', target: 'customers' }, { field: 'griRowId', target: 'griMaterialityMatrixRows', soft: true }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year', 'griRowId']],
  },
  {
    resource: 'esrsAssessmentScores',
    collection: 'esrsassessmentscores',
    prismaModel: 'ESRSAssessmentScore',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year', 'esrsRowId']],
  },
  {
    resource: 'issbAssessmentScores',
    collection: 'issbassessmentscores',
    prismaModel: 'ISSBAssessmentScore',
    references: [{ field: 'customerId', target: 'customers' }],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['customerId', 'year', 'issbRowId']],
  },
  {
    resource: 'frameworkRequirements',
    collection: 'frameworkrequirements',
    prismaModel: 'FrameworkRequirement',
    references: [],
    arrayReferences: [],
    jsonFields: ['dataPointKeys', 'alternateDataKeys', 'conditions'],
    uniqueKeys: [['disclosureId']],
  },
  {
    resource: 'complianceRuns',
    collection: 'complianceruns',
    prismaModel: 'ComplianceRun',
    references: [{ field: 'projectId', target: 'projects' }],
    arrayReferences: [],
    jsonFields: ['gaps'],
    uniqueKeys: [],
  },
  {
    resource: 'frameworkMappings',
    collection: 'frameworkmappings',
    prismaModel: 'FrameworkMapping',
    references: [],
    arrayReferences: [],
    jsonFields: ['varianceReasonGuide', 'frameworks', 'reconciliationLogic'],
    uniqueKeys: [['mappingId']],
  },
  {
    resource: 'consistencyConflicts',
    collection: 'consistencyconflicts',
    prismaModel: 'ConsistencyConflict',
    references: [{ field: 'projectId', target: 'projects' }, { field: 'mappingId', target: 'frameworkMappings', soft: true }],
    arrayReferences: [],
    jsonFields: ['framework1', 'framework2', 'variance', 'likelyCauses', 'resolution'],
    uniqueKeys: [],
  },
  {
    resource: 'climateScenarios',
    collection: 'climatescenarios',
    prismaModel: 'ClimateScenario',
    references: [{ field: 'projectId', target: 'projects' }],
    arrayReferences: [],
    jsonFields: ['selectedLevers', 'financialImpact', 'riskAssessment', 'sbtAlignment', 'roadmap'],
    uniqueKeys: [],
    // GFANZ pathway catalog rows are seeded without projectId (see climatePathwaySeed.ts).
    etlRequiredFields: ['projectId'],
    etlExcludeFieldValues: { projectId: ['__gfanz_platform_seed__'] },
  },
  {
    resource: 'transitionLeverTemplates',
    collection: 'transitionlevertemplates',
    prismaModel: 'TransitionLeverTemplate',
    references: [],
    arrayReferences: [],
    jsonFields: [
      'applicableIndustries',
      'emissionReductionRange',
      'capexRange',
      'opexRange',
      'paybackRange',
      'implementationDuration',
    ],
    uniqueKeys: [['leverId']],
  },
  {
    resource: 'sectorCategories',
    collection: 'sectorcategories',
    prismaModel: 'SectorCategory',
    references: [],
    arrayReferences: [],
    jsonFields: ['metadata'],
    uniqueKeys: [],
  },
  {
    resource: 'sasbMacroSectors',
    collection: 'sasbmacrosectors',
    prismaModel: 'SasbMacroSector',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['id']],
  },
  {
    resource: 'sasbSubSectors',
    collection: 'sasbsubsectors',
    prismaModel: 'SasbSubSector',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['id']],
  },
  {
    resource: 'naceCodeMappings',
    collection: 'nacecodemappings',
    prismaModel: 'NaceCodeMapping',
    references: [],
    arrayReferences: [],
    jsonFields: [],
    uniqueKeys: [['code']],
  },
];

export const RESOURCE_KEYS = SCHEMA_MAP.map((s) => s.resource);

export function getCollectionSpec(resource: string): CollectionSpec | undefined {
  return SCHEMA_MAP.find((s) => s.resource === resource);
}

export function getSpecByCollection(collection: string): CollectionSpec | undefined {
  return SCHEMA_MAP.find((s) => s.collection === collection);
}
