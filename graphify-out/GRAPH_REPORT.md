# Graph Report - InterviewGenie-AI  (2026-11-16)

## Corpus Check
- 387 files · ~330,806 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .csv 37, (none) 2, .css 2)

## Summary
- 1997 nodes · 4917 edges · 90 communities (65 shown, 25 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 330 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 62
- Community 63
- Community 64
- Community 65
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 88

## God Nodes (most connected - your core abstractions)
1. `react` - 55 edges
2. `search()` - 54 edges
3. `VoiceService` - 53 edges
4. `GeminiClient` - 52 edges
5. `DesignSystemGenerator` - 38 edges
6. `search_stack()` - 36 edges
7. `Button()` - 34 edges
8. `RecordingService` - 34 edges
9. `InterviewSession` - 33 edges
10. `Container()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `seed_aptitude_questions()` --uses--> `AptitudeAgent`  [INFERRED]
  backend/app/main.py → ai_engine/aptitude_agent.py
- `test_prompt_safety_zero_physical_or_emotion_evaluation()` --uses--> `EvaluationAgent`  [INFERRED]
  tests/test_ai_engine.py → ai_engine/evaluation_agent.py
- `test_prompt_safety_zero_physical_or_emotion_evaluation()` --uses--> `HRAgent`  [INFERRED]
  tests/test_ai_engine.py → ai_engine/hr_agent.py
- `test_prompt_safety_zero_physical_or_emotion_evaluation()` --uses--> `ResumeAgent`  [INFERRED]
  tests/test_ai_engine.py → ai_engine/resume_agent.py
- `test_prompt_safety_zero_physical_or_emotion_evaluation()` --uses--> `TechnicalAgent`  [INFERRED]
  tests/test_ai_engine.py → ai_engine/technical_agent.py

## Import Cycles
- None detected.

## Communities (90 total, 25 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (32): create_access_token(), decode_access_token(), get_current_user_id(), get_optional_user_id(), hash_password(), sanitize_html(), sanitize_input(), verify_password() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (22): GeminiClientError, InvalidApiKeyError, MalformedOutputError, MissingApiKeyError, QuotaExceededError, ResumeAnalyzer, _call(), LabeledResumeQuestion (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (32): AuthContext, AuthContextType, ApiService, AnalyticsResponse, AnalyticsSummary, AptitudeMCQ, AptitudeResultItem, AptitudeSubmitPayload (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (9): MediaCleanupService, AudioProcessor, ConsentRequiredError, RecordingManager, MediaStorageService, test_audio_processor_metrics(), test_media_cleanup_service_purged_recordings(), test_media_storage_lifecycle() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (19): normalize_stem(), OfflineQuizBank, QuizGenerator, LabeledQuizQuestion, QuizQuestionSchema, test_flow_3_quiz_generation_and_grading(), test_deterministic_grading_batch_submission(), test_deterministic_grading_single_question() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): Answer, EvaluationReport, generate_uuid(), InterviewSession, Question, get_evaluation_report(), test_analytics_empty_state_for_new_user(), test_analytics_in_progress_interviews() (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (36): create_interview(), download_pdf_report(), end_interview(), get_current_question(), get_interview(), get_interview_transcript(), list_interviews(), repeat_question() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (51): dependencies, clsx@^2.1.1, lucide-react@^1.73.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, recharts@^3.10.1, tailwind-merge@^3.7.0 (+43 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (12): InterviewCoordinator, EchoStripper, strip_ai_echo(), CoordinatorTurnResult, SessionState, test_adaptive_follow_up_on_brief_or_evasive_candidate_answer(), test_conversation_memory_per_session(), test_coordinator_question_count_and_termination() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (4): IBrowserSpeechRecognition, TurnTakingState, VoiceRecognitionState, VoiceService

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (14): Settings, get_db(), api_health(), health_alias(), lifespan(), root(), seed_aptitude_questions(), get_profile() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (33): TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract() (+25 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (21): BadgeProps, ButtonProps, CardProps, ContainerProps, EmptyStateProps, ErrorStateProps, InputProps, LoadingSkeletonProps (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (22): _contains_phrase(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _file_signature(), _get_bm25(), _legacy_successor_guidance(), _load_csv() (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (10): _normalize_rtl_level(), _project_row(), _rtl_row_filter(), search(), _style_search_destination(), _valid_max_results(), TestSearchDomains, TestImeGuidance (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (12): CoordinatorAgent, TechnicalAgent, test_coordinator_agent_aptitude_turn(), test_coordinator_agent_multi_turn_lifecycle(), test_coordinator_agent_state_machine_difficulty_adaptation(), test_technical_agent_all_domains_and_difficulties(), test_technical_agent_assess_code_empty_and_valid(), test_technical_agent_domain_alias_normalization() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (16): AnswerEvaluator, compute_overall_score(), compute_round_score(), determine_tier(), DeterministicEvaluator, AnswerEvaluationSchema, CriterionEvaluationSchema, EvaluationReportSchema (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (7): _exact_stack_identifier(), search_stack(), _rows(), TestNativeDesktopStackFreshness, TestTextLayoutRetrieval, _rows(), TestWebStackFreshness

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (16): ansi_ljust(), _detect_page_type(), format_ascii_box(), add_wrapped(), wrap_text(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (27): AnalyticsPage, App(), AptitudeRoomPage, AuthPage, DashboardPage, HistoryPage, InterviewSetupPage, LandingPage (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (25): HardwareDiagnostics(), HardwareDiagnosticsProps, Badge(), Button(), Card(), Container(), Input(), Modal() (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (8): ConsentListener, DurationListener, RecordingConsentError, RecordingService, StateListener, RecordedMedia, RecordingConsent, RecordingState

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (8): read_rows(), RtlDataContractTest, resolve(), shipped_invocations(), SkillScriptPathsTest, read_rows(), read_rows(), TestTextLayoutDataContracts

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (30): playSpeakerChime(), cameraService, ErrorListener, PermissionListener, StateListener, mediaServices, recordingService, CameraState (+22 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (15): LiveInterviewer, grade_quiz_answer(), grade_quiz_submission(), main(), run_flow_1_hr_interview(), run_flow_2_coordinator_adaptation(), run_flow_3_quiz_generation_grading(), run_flow_4_resume_analysis() (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (5): GeminiClient, mask_api_key(), test_api_key_never_logged_or_exposed(), test_successful_structured_question_generation(), test_transient_error_retry_success()

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (5): BM25, _suggest_identities(), TestBm25CoreBehavior, TestDiagnosticsContracts, TestTokenizer

### Community 27 - "Community 27"
Cohesion: 0.21
Nodes (7): AptitudeAgent, BaseAgent, ResumeAgent, test_base_agent_clean_json_response_variations(), test_base_agent_safe_float(), test_resume_agent_extraction_and_grounding(), test_coordinator_difficulty_adaptation_matrix()

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (8): HRAgent, run_full_validation(), validate_schema(), verify_adaptive_follow_up(), test_hr_agent_adaptive_follow_up_guides_star_on_short_and_evasive_answers(), test_hr_agent_evaluation_and_follow_up(), test_hr_agent_star_methodology_scoring(), test_hr_agent_json_structure_and_difficulty()

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (22): EmptyState(), ErrorState(), LoadingSkeleton(), Table(), TableBody(), TableBodyProps, TableCell(), TableCellProps (+14 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (3): read_rows(), TestLandingAndStackContract, TestReasoningContract

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (7): OfflineFallbackBank, ConversationTurn, InterviewQuestionSchema, LabeledQuestion, ProjectItemSchema, QuizBatchGradingResult, QuizGradingResult

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (3): DesignSystemGenerator, TestReasoningMatch, TestEndToEndCoherence

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (11): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), contrast_ratio() (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (7): GeminiClient, test_gemini_client_answer_evaluation_fallback_quality_sensitive(), test_gemini_client_code_assessment_fallback(), test_gemini_client_follow_up_fallback_guides_star(), test_gemini_client_offline_fallback_structured_json(), test_gemini_client_rate_limit_resilience(), test_prompt_safety_zero_physical_or_emotion_evaluation()

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (7): MediaConsent, cleanup_purged_media(), delete_interview_recordings(), get_media_status(), set_media_consent(), MediaConsentRequest, MediaConsentResponse

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (5): _palette_is_dark(), _relative_luminance(), _select_palette_for_mode(), TestLuminance, TestPaletteSelection

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (8): create_sample_pdf(), test_api_endpoint_returns_clean_structured_json(), test_clean_extracted_text_whitespace_normalization(), test_invalid_pdf_header_signature_rejected(), test_pdf_extraction_with_pymupdf(), test_resume_processing_integration_and_grounded_questions(), test_zero_raw_text_logging_in_service(), test_zero_raw_text_logging_via_api()

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (11): compute_user_analytics(), get_analytics(), get_analytics_progression(), get_analytics_skills_radar(), get_analytics_summary(), AnalyticsResponse, AnalyticsSummary, CompetencyRadarItem (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (4): EvaluationAgent, verify_deterministic_scoring(), test_evaluation_agent_deterministic_rubric_aggregation(), test_evaluation_agent_empty_and_null_evaluations()

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (5): build_docx_report(), set_cell_background(), set_cell_margins(), style_table_header(), style_table_rows()

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (3): test_aptitude_agent_grade_single_answer(), test_aptitude_agent_zero_leak_and_single_question(), test_aptitude_agent_json_structure_and_grading()

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (6): setup_database(), test_aptitude_flow(), test_auth_and_profile_flow(), test_health_endpoints(), test_interview_session_and_evaluation_flow(), test_media_and_consent_flow()

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 51 - "Community 51"
Cohesion: 0.23
Nodes (11): TabItem, TabList(), TabListProps, TabPanel(), TabPanelProps, Tabs(), TabsContext, TabsContextType (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (6): test_api_endpoint_rejects_non_pdf_files(), test_api_endpoint_rejects_oversized_file(), test_file_upload_accepts_valid_pdf_under_10mb(), test_file_upload_rejects_files_larger_than_10mb(), test_file_upload_rejects_non_pdf_extensions(), test_file_upload_unauthenticated_rejected()

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (4): add_card(), add_header(), build_pptx_deck(), set_slide_background()

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (4): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 55 - "Community 55"
Cohesion: 0.26
Nodes (6): AptitudeQuestion, get_aptitude_test(), submit_aptitude_test(), AptitudeResultItem, AptitudeSubmitRequest, AptitudeSubmitResponse

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (11): captureViewport(), DIST_DIR, fs, http, main(), MIME_TYPES, OUTPUT_DIR_DESKTOP, OUTPUT_DIR_MOBILE (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (5): client(), db_session(), registered_user(), setup_database(), unique_email()

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (4): _button_outline_text_color(), _contrast_ratio(), _derive_dark_palette(), format_master_md()

### Community 59 - "Community 59"
Cohesion: 0.24
Nodes (3): format_markdown(), _mode_support_labels(), TestLightResultOutputCoherence

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (6): fs, generateMarkdownReport(), path, ROUTES, runAudit(), VIEWPORTS

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (4): fs, path, ROUTES, VIEWPORTS

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (4): { chromium }, path, { chromium }, path

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (4): fs, path, ROUTES, VIEWPORTS

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (4): { chromium }, fs, http, path

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (4): fs, path, ROUTES, VIEWPORTS

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (4): fs, path, ROUTES, VIEWPORTS

### Community 81 - "Community 81"
Cohesion: 0.60
Nodes (4): ToastContext, ToastContextType, ToastMessage, ToastType

## Knowledge Gaps
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `search()` connect `Community 14` to `Community 32`, `Community 33`, `Community 13`, `Community 48`, `Community 17`, `Community 18`, `Community 22`, `Community 26`, `Community 30`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `GeminiClient` (e.g. with `AnswerEvaluator` and `InterviewQuestionSchema`) actually correct?**
  _`GeminiClient` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04576576576576576 - nodes in this community are weakly interconnected._
- **Why does `DesignSystemGenerator` connect `Community 32` to `Community 58`, `Community 37`, `Community 18`, `Community 50`, `Community 26`, `Community 59`, `Community 30`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06873706004140787 - nodes in this community are weakly interconnected._
- **Why does `CatalogRefreshTest` connect `Community 44` to `Community 22`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06994535519125683 - nodes in this community are weakly interconnected._