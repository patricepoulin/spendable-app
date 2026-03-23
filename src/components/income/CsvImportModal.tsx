import { useState, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, Button, Text, HStack, VStack, Icon, Select, Table, Thead, Tbody, Tr, Th, Td,
  Alert, AlertIcon, Badge, Spinner, useToast, Progress, Tooltip,
} from '@chakra-ui/react';
import {
  RiUploadLine, RiFileLine, RiDownloadLine, RiCheckLine,
  RiErrorWarningLine, RiInformationLine, RiAlertLine,
} from 'react-icons/ri';
import { useAuth } from '../../hooks/useAuth';
import { incomeApi, IS_MOCK } from '../../lib/supabase';
import { FREE_INCOME_LIMIT } from '../../services/stripe';
import {
  parseImportFile, autoDetectMapping, validateAndTransformRows, downloadCsvTemplate,
  ACCEPTED_EXTENSIONS, ACCEPTED_LABEL,
} from '../../utils/csvImport';
import type {
  CsvParsedRow, ColumnMapping, ImportStep,
} from '../../types/csvImport';
import {
  CSV_IMPORT_FIELDS, CSV_FIELD_LABELS, MAX_IMPORT_ROWS,
} from '../../types/csvImport';

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  surface:  '#ffffff',
  border:   '#e2e8f0',
  theadBg:  '#f8fafc',
  muted:    '#64748b',
  subtext:  '#94a3b8',
  brand:    '#4C5FD5',
  success:  '#27AE60',
  warning:  '#f59e0b',
  error:    '#e11d48',
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'upload',  label: 'Upload'  },
  { key: 'mapping', label: 'Columns' },
  { key: 'preview', label: 'Preview' },
];

function StepBar({ current }: { current: ImportStep }) {
  const stepIndex = STEPS.findIndex(s => s.key === current);
  return (
    <HStack spacing={0} mb={6}>
      {STEPS.map((s, i) => {
        const done    = i < stepIndex;
        const active  = i === stepIndex;
        const future  = i > stepIndex;
        return (
          <HStack key={s.key} spacing={0} flex={1} align="center">
            <VStack spacing={0.5} align="center" flex={1}>
              <Box
                w={7} h={7} borderRadius="full"
                bg={done ? C.success : active ? C.brand : C.border}
                display="flex" alignItems="center" justifyContent="center"
                transition="all 0.2s"
              >
                {done
                  ? <Icon as={RiCheckLine} color="white" boxSize="13px" />
                  : <Text fontSize="11px" fontWeight="700" color={active ? 'white' : C.subtext}>{i + 1}</Text>
                }
              </Box>
              <Text fontSize="10px" fontWeight={active ? '700' : '500'}
                color={future ? C.subtext : active ? C.brand : C.muted}>
                {s.label}
              </Text>
            </VStack>
            {i < STEPS.length - 1 && (
              <Box flex={1} h="1px" bg={done ? C.success : C.border} transition="all 0.2s" mb={3} />
            )}
          </HStack>
        );
      })}
    </HStack>
  );
}

// ─── Upload step ──────────────────────────────────────────────────────────────

function UploadStep({
  onFile, onTemplate,
}: {
  onFile:     (f: File) => void;
  onTemplate: () => void;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    const ext = file?.name.toLowerCase(); if (ext?.endsWith('.csv') || ext?.endsWith('.xlsx') || ext?.endsWith('.xls')) onFile(file);
  }, [onFile]);

  return (
    <VStack spacing={5} align="stretch">
      {/* Drop zone */}
      <Box
        border="2px dashed"
        borderColor={dragging ? C.brand : C.border}
        borderRadius="14px"
        p={10}
        textAlign="center"
        cursor="pointer"
        bg={dragging ? '#eef0fb' : '#fafafa'}
        transition="all 0.15s"
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        _hover={{ borderColor: C.brand, bg: '#f5f6fe' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Box
          w={12} h={12} borderRadius="12px" bg="#eef0fb" mx="auto" mb={3}
          display="flex" alignItems="center" justifyContent="center"
        >
          <Icon as={RiUploadLine} color={C.brand} boxSize={5} />
        </Box>
        <Text fontSize="14px" fontWeight="600" color="#1C2B3A" mb={1}>
          Drop your CSV file here
        </Text>
        <Text fontSize="12px" color={C.muted}>
          or click to browse · {ACCEPTED_LABEL} · max {MAX_IMPORT_ROWS} rows
        </Text>
      </Box>

      {/* Template download */}
      <HStack
        px={4} py={3} bg="#f8fafc" borderRadius="10px"
        border="1px solid" borderColor={C.border}
        justify="space-between"
      >
        <HStack spacing={3}>
          <Icon as={RiFileLine} color={C.muted} boxSize="16px" />
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="13px" fontWeight="600" color="#1C2B3A">Download a template</Text>
            <Text fontSize="12px" color={C.muted}>Date · Source · Amount · Notes</Text>
          </VStack>
        </HStack>
        <Button
          leftIcon={<Icon as={RiDownloadLine} />}
          size="sm" variant="outline" borderColor={C.border}
          bg="white" color={C.muted} borderRadius="8px"
          fontWeight="600" fontSize="12px"
          _hover={{ bg: '#F0EFE9' }}
          onClick={e => { e.stopPropagation(); onTemplate(); }}
        >
          Download template
        </Button>
      </HStack>

      <Alert status="info" borderRadius="10px" bg="#eef0fb" border="1px solid #c7d0f5">
        <AlertIcon as={RiInformationLine} color={C.brand} />
        <Text fontSize="12px" color="#3d4faf">
          Import is for <strong>income entries only</strong>. Recurring expenses and upcoming bills must be added manually.
        </Text>
      </Alert>
    </VStack>
  );
}

// ─── Mapping step ─────────────────────────────────────────────────────────────

function MappingStep({
  headers,
  mapping,
  onChange,
}: {
  headers:  string[];
  mapping:  ColumnMapping;
  onChange: (m: ColumnMapping) => void;
}) {
  return (
    <VStack spacing={5} align="stretch">
      <Text fontSize="13px" color={C.muted}>
        Match each required field to the corresponding column in your CSV.
      </Text>

      <Box bg={C.surface} border="1px solid" borderColor={C.border} borderRadius="12px" overflow="hidden">
        <Table variant="simple" size="sm">
          <Thead bg={C.theadBg}>
            <Tr>
              <Th fontSize="10px" fontWeight="700" color={C.subtext} textTransform="uppercase" letterSpacing="0.8px" py={3} borderColor={C.border}>
                Spendable Field
              </Th>
              <Th fontSize="10px" fontWeight="700" color={C.subtext} textTransform="uppercase" letterSpacing="0.8px" py={3} borderColor={C.border}>
                Your CSV Column
              </Th>
              <Th fontSize="10px" fontWeight="700" color={C.subtext} textTransform="uppercase" letterSpacing="0.8px" py={3} borderColor={C.border}>
                Required?
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {CSV_IMPORT_FIELDS.map(field => (
              <Tr key={field}>
                <Td py={3} borderColor={C.border}>
                  <Text fontSize="13px" fontWeight="600" color="#1C2B3A">
                    {CSV_FIELD_LABELS[field]}
                  </Text>
                </Td>
                <Td py={3} borderColor={C.border}>
                  <Select
                    size="sm"
                    value={mapping[field]}
                    onChange={e => onChange({ ...mapping, [field]: e.target.value })}
                    borderRadius="8px"
                    fontSize="13px"
                    borderColor={!mapping[field] && field !== 'notes' ? C.error : C.border}
                  >
                    <option value="">— not mapped —</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                </Td>
                <Td py={3} borderColor={C.border}>
                  {field !== 'notes' ? (
                    <Badge colorScheme="red" fontSize="10px" borderRadius="6px">Required</Badge>
                  ) : (
                    <Badge colorScheme="gray" fontSize="10px" borderRadius="6px">Optional</Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}

// ─── Preview step ─────────────────────────────────────────────────────────────

const MAX_PREVIEW = 5;

function PreviewStep({
  rows,
  totalRows,
  skipDuplicates,
  onToggleSkipDuplicates,
  existingCount,
  isPro,
}: {
  rows:                  CsvParsedRow[];
  totalRows:             number;
  skipDuplicates:        boolean;
  onToggleSkipDuplicates: () => void;
  existingCount:         number;
  isPro:                 boolean;
}) {
  const validRows   = rows.filter(r => r.valid && !(skipDuplicates && r.isDuplicate));
  const errorRows   = rows.filter(r => !r.valid);
  const dupRows     = rows.filter(r => r.isDuplicate);
  const wouldExceed = !isPro && (existingCount + validRows.length) > FREE_INCOME_LIMIT;
  const preview     = rows.slice(0, MAX_PREVIEW);

  return (
    <VStack spacing={4} align="stretch">
      {/* Stats bar */}
      <HStack spacing={3} flexWrap="wrap">
        <HStack spacing={1.5} bg="#f0fdf4" px={3} py={1.5} borderRadius="8px" border="1px solid #bbf7d0">
          <Icon as={RiCheckLine} color={C.success} boxSize="13px" />
          <Text fontSize="12px" fontWeight="600" color="#15803d">{validRows.length} valid</Text>
        </HStack>
        {errorRows.length > 0 && (
          <HStack spacing={1.5} bg="#fff1f2" px={3} py={1.5} borderRadius="8px" border="1px solid #fecdd3">
            <Icon as={RiErrorWarningLine} color={C.error} boxSize="13px" />
            <Text fontSize="12px" fontWeight="600" color={C.error}>{errorRows.length} errors</Text>
          </HStack>
        )}
        {dupRows.length > 0 && (
          <HStack
            spacing={1.5} bg="#fffbeb" px={3} py={1.5} borderRadius="8px" border="1px solid #fde68a"
            cursor="pointer" onClick={onToggleSkipDuplicates}
            _hover={{ bg: '#fef3c7' }}
          >
            <Icon as={RiAlertLine} color={C.warning} boxSize="13px" />
            <Text fontSize="12px" fontWeight="600" color="#92400e">
              {dupRows.length} duplicate{dupRows.length !== 1 ? 's' : ''}
              {' '}· {skipDuplicates ? 'skipping ✓' : 'click to skip'}
            </Text>
          </HStack>
        )}
        {totalRows > MAX_PREVIEW && (
          <Text fontSize="12px" color={C.muted}>
            Showing first {MAX_PREVIEW} of {totalRows} rows
          </Text>
        )}
      </HStack>

      {/* Free plan warning */}
      {wouldExceed && (
        <Alert status="warning" borderRadius="10px" bg="#fffbeb" border="1px solid #fde68a">
          <AlertIcon as={RiAlertLine} color={C.warning} />
          <Text fontSize="12px" color="#92400e">
            You have <strong>{existingCount}</strong> income entries. Importing <strong>{validRows.length}</strong> more
            would exceed the Free plan limit of <strong>{FREE_INCOME_LIMIT}</strong>.
            Upgrade to Pro to import unlimited income.
          </Text>
        </Alert>
      )}

      {/* Preview table */}
      <Box border="1px solid" borderColor={C.border} borderRadius="12px" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg={C.theadBg}>
              <Tr>
                {['#', 'Date', 'Source', 'Amount', 'Notes', 'Status'].map(h => (
                  <Th key={h} py={3} fontSize="10px" fontWeight="700" color={C.subtext}
                    textTransform="uppercase" letterSpacing="0.8px" borderColor={C.border}>
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {preview.map(row => {
                const isSkipped = skipDuplicates && row.isDuplicate;
                const rowBg = !row.valid ? '#fff8f8' : row.isDuplicate ? '#fffdf0' : 'transparent';
                return (
                  <Tr key={row._rowIndex} bg={rowBg} opacity={isSkipped ? 0.45 : 1}>
                    <Td py={2.5} borderColor={C.border}>
                      <Text fontSize="12px" color={C.subtext}>{row._rowIndex}</Text>
                    </Td>
                    <Td py={2.5} borderColor={C.border}>
                      <Text fontSize="12px" color={row.parsedDate ? '#1C2B3A' : C.error}>
                        {row.parsedDate ?? row.date}
                      </Text>
                    </Td>
                    <Td py={2.5} borderColor={C.border}>
                      <Text fontSize="12px" color="#1C2B3A" isTruncated maxW="120px">{row.source || '—'}</Text>
                    </Td>
                    <Td py={2.5} borderColor={C.border}>
                      <Text fontSize="12px" color={row.parsedAmount !== undefined ? '#1C2B3A' : C.error} fontWeight="600">
                        {row.parsedAmount !== undefined ? row.parsedAmount.toLocaleString() : row.amount || '—'}
                      </Text>
                    </Td>
                    <Td py={2.5} borderColor={C.border}>
                      <Text fontSize="12px" color={C.muted} isTruncated maxW="100px">{row.notes || '—'}</Text>
                    </Td>
                    <Td py={2.5} borderColor={C.border}>
                      {!row.valid ? (
                        <Tooltip label={row.errors.join(' · ')} placement="top">
                          <Badge colorScheme="red" fontSize="10px" borderRadius="6px" cursor="help">Error</Badge>
                        </Tooltip>
                      ) : row.isDuplicate ? (
                        <Badge colorScheme="yellow" fontSize="10px" borderRadius="6px">
                          {isSkipped ? 'Skipped' : 'Duplicate'}
                        </Badge>
                      ) : (
                        <Badge colorScheme="green" fontSize="10px" borderRadius="6px">✓ Ready</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Row-level errors summary */}
      {errorRows.length > 0 && (
        <Box bg="#fff8f8" border="1px solid #fecdd3" borderRadius="10px" p={4}>
          <Text fontSize="12px" fontWeight="700" color={C.error} mb={2}>
            Rows with errors (will be skipped):
          </Text>
          <VStack spacing={1} align="stretch">
            {errorRows.slice(0, 5).map(r => (
              <Text key={r._rowIndex} fontSize="12px" color={C.error}>
                Row {r._rowIndex}: {r.errors.join(' · ')}
              </Text>
            ))}
            {errorRows.length > 5 && (
              <Text fontSize="12px" color={C.muted}>…and {errorRows.length - 5} more</Text>
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface CsvImportModalProps {
  isOpen:           boolean;
  onClose:          () => void;
  onImportComplete: () => void;
  isPro:            boolean;
  onUpgradeNeeded:  () => void;
}

export function CsvImportModal({
  isOpen, onClose, onImportComplete, isPro, onUpgradeNeeded,
}: CsvImportModalProps) {
  const { user }  = useAuth();
  const toast     = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [step,            setStep]            = useState<ImportStep>('upload');
  const [fileName,        setFileName]        = useState('');
  const [headers,         setHeaders]         = useState<string[]>([]);
  const [rawRows,         setRawRows]         = useState<import('../../types/csvImport').CsvRawRow[]>([]);
  const [mapping,         setMapping]         = useState<ColumnMapping>({ date: '', source: '', amount: '', notes: '' });
  const [parsedRows,      setParsedRows]      = useState<CsvParsedRow[]>([]);
  const [skipDuplicates,  setSkipDuplicates]  = useState(false);
  const [existingCount,   setExistingCount]   = useState(0);
  const [tooLarge,        setTooLarge]        = useState(false);
  const [parseError,      setParseError]      = useState('');
  const [importing,       setImporting]       = useState(false);
  const [importProgress,  setImportProgress]  = useState(0);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('upload'); setFileName(''); setHeaders([]); setRawRows([]);
    setMapping({ date: '', source: '', amount: '', notes: '' });
    setParsedRows([]); setSkipDuplicates(false); setExistingCount(0);
    setTooLarge(false); setParseError(''); setImporting(false); setImportProgress(0);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1: File selected ─────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);

    const result = await parseImportFile(file);
    if (result.error) { setParseError(result.error); return; }
    if (result.rows.length === 0) { setParseError('The CSV file is empty.'); return; }

    setTooLarge(result.rows.length > MAX_IMPORT_ROWS);
    setHeaders(result.headers);
    setRawRows(result.rows);
    setMapping(autoDetectMapping(result.headers));
    setStep('mapping');
  };

  // ── Step 2: Proceed to preview ────────────────────────────────────────────
  const handlePreview = async () => {
    // Require date, source, amount mapped
    for (const f of ['date', 'source', 'amount'] as const) {
      if (!mapping[f]) {
        setParseError(`Please map the "${CSV_FIELD_LABELS[f]}" column before continuing.`);
        return;
      }
    }
    setParseError('');

    // Fetch existing count for free-plan gating
    if (user) {
      try {
        const c = await incomeApi.count(user.id);
        setExistingCount(c);
      } catch { /* non-fatal */ }
    }

    const { rows } = validateAndTransformRows(rawRows, mapping);
    setParsedRows(rows);
    setStep('preview');
  };

  // ── Step 3: Import ────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!user) return;

    const toImport = parsedRows.filter(r => r.valid && !(skipDuplicates && r.isDuplicate));

    // Free plan gate
    if (!isPro && (existingCount + toImport.length) > FREE_INCOME_LIMIT) {
      onUpgradeNeeded();
      return;
    }

    if (toImport.length === 0) {
      toast({ title: 'Nothing to import', description: 'All rows have errors or are skipped.', status: 'warning', duration: 4000, isClosable: true });
      return;
    }

    setImporting(true);
    setStep('importing');
    setImportProgress(0);

    try {
      const BATCH = 50;
      let inserted = 0;

      for (let i = 0; i < toImport.length; i += BATCH) {
        const chunk = toImport.slice(i, i + BATCH).map(r => ({
          user_id: user.id,
          date:    r.parsedDate!,
          source:  r.source,
          amount:  r.parsedAmount!,
          notes:   r.notes,
        }));

        const n = await incomeApi.batchInsert(chunk);
        inserted += n;
        setImportProgress(Math.round((inserted / toImport.length) * 100));
      }

      toast({
        title: `${inserted} income ${inserted === 1 ? 'entry' : 'entries'} imported`,
        status: 'success', duration: 4000, isClosable: true,
      });

      setStep('done');
      onImportComplete();
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : String(err),
        status: 'error', duration: 6000, isClosable: true,
      });
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const validToImport = parsedRows.filter(r => r.valid && !(skipDuplicates && r.isDuplicate));
  const canImport     = validToImport.length > 0 &&
    (isPro || (existingCount + validToImport.length) <= FREE_INCOME_LIMIT);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.200" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="16px" border="1px solid" borderColor={C.border} shadow="xl" mx={4}>
        <ModalHeader fontWeight="700" fontSize="16px" pb={2} borderBottom="1px solid" borderColor={C.border}>
          <HStack spacing={3}>
            <Box w={8} h={8} borderRadius="8px" bg="#eef0fb"
              display="flex" alignItems="center" justifyContent="center">
              <Icon as={RiUploadLine} color={C.brand} boxSize="16px" />
            </Box>
            <Box>
              <Text>Import Income from CSV</Text>
              {fileName && (
                <Text fontSize="12px" fontWeight="400" color={C.muted} mt={0.5}>
                  <Icon as={RiFileLine} boxSize="11px" mr={1} />
                  {fileName}
                </Text>
              )}
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton mt={2} />

        <ModalBody py={6}>
          {/* Step indicator — only for the main 3 steps */}
          {(step === 'upload' || step === 'mapping' || step === 'preview') && (
            <StepBar current={step} />
          )}

          {/* Parse error alert */}
          {parseError && (
            <Alert status="error" borderRadius="10px" mb={4}>
              <AlertIcon />
              <Text fontSize="13px">{parseError}</Text>
            </Alert>
          )}

          {/* Too large warning */}
          {tooLarge && step !== 'upload' && (
            <Alert status="warning" borderRadius="10px" mb={4} bg="#fffbeb" border="1px solid #fde68a">
              <AlertIcon as={RiAlertLine} color={C.warning} />
              <Text fontSize="12px" color="#92400e">
                Your file has more than {MAX_IMPORT_ROWS} rows. Only the first {MAX_IMPORT_ROWS} will be imported.
              </Text>
            </Alert>
          )}

          {/* Steps */}
          {step === 'upload' && (
            <UploadStep
              onFile={handleFile}
              onTemplate={downloadCsvTemplate}
            />
          )}

          {step === 'mapping' && (
            <MappingStep
              headers={headers}
              mapping={mapping}
              onChange={setMapping}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              rows={parsedRows}
              totalRows={rawRows.length}
              skipDuplicates={skipDuplicates}
              onToggleSkipDuplicates={() => setSkipDuplicates(s => !s)}
              existingCount={existingCount}
              isPro={isPro}
            />
          )}

          {step === 'importing' && (
            <VStack spacing={5} py={8} align="center">
              <Spinner color={C.brand} size="lg" />
              <VStack spacing={1}>
                <Text fontSize="14px" fontWeight="600" color="#1C2B3A">Importing…</Text>
                <Text fontSize="12px" color={C.muted}>{importProgress}% complete</Text>
              </VStack>
              <Box w="full" maxW="300px">
                <Progress value={importProgress} size="sm" colorScheme="blue"
                  borderRadius="full" bg="#e2e8f0" />
              </Box>
            </VStack>
          )}

          {step === 'done' && (
            <VStack spacing={4} py={8} align="center">
              <Box w={14} h={14} borderRadius="full" bg="#f0fdf4"
                display="flex" alignItems="center" justifyContent="center">
                <Icon as={RiCheckLine} color={C.success} boxSize={7} />
              </Box>
              <VStack spacing={1}>
                <Text fontSize="15px" fontWeight="700" color="#1C2B3A">Import complete</Text>
                <Text fontSize="13px" color={C.muted}>
                  {validToImport.length} income {validToImport.length === 1 ? 'entry' : 'entries'} added successfully
                </Text>
              </VStack>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter gap={2} borderTop="1px solid" borderColor={C.border}>
          {step === 'upload' && (
            <Button variant="ghost" onClick={handleClose} borderRadius="10px"
              fontWeight="600" fontSize="13px">
              Cancel
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')} borderRadius="10px"
                fontWeight="600" fontSize="13px">
                Back
              </Button>
              <Button bg={C.brand} color="white" borderRadius="10px"
                fontWeight="600" fontSize="13px" _hover={{ bg: '#3D4FBF' }}
                onClick={handlePreview}>
                Preview data
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('mapping')} borderRadius="10px"
                fontWeight="600" fontSize="13px">
                Back
              </Button>
              <Button
                bg={canImport ? C.brand : '#94a3b8'}
                color="white" borderRadius="10px"
                fontWeight="600" fontSize="13px"
                _hover={{ bg: canImport ? '#3D4FBF' : '#94a3b8' }}
                isDisabled={validToImport.length === 0}
                onClick={canImport ? handleImport : onUpgradeNeeded}
              >
                {canImport
                  ? `Import ${validToImport.length} ${validToImport.length === 1 ? 'entry' : 'entries'}`
                  : `Upgrade to import`
                }
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button bg={C.brand} color="white" borderRadius="10px"
              fontWeight="600" fontSize="13px" _hover={{ bg: '#3D4FBF' }}
              onClick={handleClose}>
              Done
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
