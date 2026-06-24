BEGIN;

WITH org AS (
    SELECT id FROM organizations ORDER BY id LIMIT 1
),
dept_labour_cat AS (
    INSERT INTO form_categories (organization_id, name)
    SELECT (SELECT id FROM org), 'Departmental Labour Register'
    WHERE NOT EXISTS (SELECT 1 FROM form_categories WHERE name = 'Departmental Labour Register')
    RETURNING id
),
mat_receipt_cat AS (
    INSERT INTO form_categories (organization_id, name)
    SELECT (SELECT id FROM org), 'Material Receipt Register'
    WHERE NOT EXISTS (SELECT 1 FROM form_categories WHERE name = 'Material Receipt Register')
    RETURNING id
),
mat_issue_cat AS (
    INSERT INTO form_categories (organization_id, name)
    SELECT (SELECT id FROM org), 'Material Issue Register'
    WHERE NOT EXISTS (SELECT 1 FROM form_categories WHERE name = 'Material Issue Register')
    RETURNING id
),
dept_labour_tmpl AS (
    INSERT INTO form_templates (category_id, template)
    SELECT
        COALESCE(
            (SELECT id FROM dept_labour_cat),
            (SELECT id FROM form_categories WHERE name = 'Departmental Labour Register' LIMIT 1)
        ),
        '{
          "title": "Departmental Labour Register",
          "version": 1,
          "fields": [
            {"name": "date", "label": "Date", "type": "date", "required": true},
            {"name": "challan_no", "label": "Challan No", "type": "text", "required": true},
            {"name": "sub_contractor_name", "label": "Sub Contractor Name", "type": "text", "required": true},
            {"name": "name_of_labor", "label": "Name of Labor", "type": "text", "required": true},
            {"name": "labour_category", "label": "Labour Category", "type": "select", "required": true},
            {"name": "no_of_mandays", "label": "No of Mandays", "type": "number", "required": true},
            {"name": "workdone_details", "label": "Workdone Details", "type": "textarea", "required": true},
            {"name": "approx_quantity", "label": "Approx Quantity", "type": "number", "required": false},
            {"name": "unit", "label": "Unit", "type": "text", "required": false},
            {"name": "recovery_from", "label": "Recovery From", "type": "text", "required": false},
            {"name": "recovery_rate", "label": "Recovery Rate", "type": "number", "required": false},
            {"name": "recovery_amount", "label": "Recovery Amount", "type": "number", "required": false},
            {"name": "authorised_by", "label": "Authorised By", "type": "text", "required": true},
            {"name": "debit_details", "label": "Debit Details", "type": "textarea", "required": false},
            {"name": "remarks", "label": "Remarks", "type": "textarea", "required": false}
          ]
        }'::jsonb
    WHERE NOT EXISTS (
        SELECT 1
        FROM form_templates t
        JOIN form_categories c ON c.id = t.category_id
        WHERE c.name = 'Departmental Labour Register'
          AND t.template ->> 'title' = 'Departmental Labour Register'
          AND (t.template ->> 'version')::integer = 1
    )
    RETURNING id
),
mat_receipt_tmpl AS (
    INSERT INTO form_templates (category_id, template)
    SELECT
        COALESCE(
            (SELECT id FROM mat_receipt_cat),
            (SELECT id FROM form_categories WHERE name = 'Material Receipt Register' LIMIT 1)
        ),
        '{
          "title": "Material Receipt Register",
          "version": 1,
          "fields": [
            {"name": "date", "label": "Date", "type": "date", "required": true},
            {"name": "time_in", "label": "Time In", "type": "datetime", "required": true},
            {"name": "po_no", "label": "PO No", "type": "text", "required": true},
            {"name": "grn_no", "label": "GRN No", "type": "text", "required": true},
            {"name": "material_description", "label": "Material Description", "type": "textarea", "required": true},
            {"name": "unit", "label": "Unit", "type": "text", "required": true},
            {"name": "supplier", "label": "Supplier", "type": "text", "required": true},
            {"name": "quantity_received", "label": "Quantity Received", "type": "number", "required": true},
            {"name": "quantity_rejected", "label": "Quantity Rejected", "type": "number", "required": true},
            {"name": "quantity_accepted", "label": "Quantity Accepted", "type": "number", "required": true},
            {"name": "remarks", "label": "Remarks", "type": "textarea", "required": false}
          ]
        }'::jsonb
    WHERE NOT EXISTS (
        SELECT 1
        FROM form_templates t
        JOIN form_categories c ON c.id = t.category_id
        WHERE c.name = 'Material Receipt Register'
          AND t.template ->> 'title' = 'Material Receipt Register'
          AND (t.template ->> 'version')::integer = 1
    )
    RETURNING id
),
mat_issue_tmpl AS (
    INSERT INTO form_templates (category_id, template)
    SELECT
        COALESCE(
            (SELECT id FROM mat_issue_cat),
            (SELECT id FROM form_categories WHERE name = 'Material Issue Register' LIMIT 1)
        ),
        '{
          "title": "Material Issue Register",
          "version": 1,
          "fields": [
            {"name": "date", "label": "Date", "type": "date", "required": true},
            {"name": "time", "label": "Time", "type": "datetime", "required": true},
            {"name": "issue_slip_no", "label": "Issue Slip No", "type": "text", "required": true},
            {"name": "issue_slip_date", "label": "Issue Slip Date", "type": "date", "required": true},
            {"name": "wo_no", "label": "WO No", "type": "text", "required": true},
            {"name": "contractor_name", "label": "Contractor Name", "type": "text", "required": true},
            {"name": "grn_no", "label": "GRN No", "type": "text", "required": true},
            {"name": "material_name", "label": "Material Name", "type": "text", "required": true},
            {"name": "unit", "label": "Unit", "type": "text", "required": true},
            {"name": "qty_issued", "label": "Qty Issued", "type": "number", "required": true},
            {"name": "qty_returned", "label": "Qty Returned", "type": "number", "required": false},
            {"name": "milestone_details", "label": "Milestone Details", "type": "textarea", "required": false},
            {"name": "wbs_1", "label": "WBS 1", "type": "text", "required": false},
            {"name": "wbs_2", "label": "WBS 2", "type": "text", "required": false},
            {"name": "location", "label": "Location", "type": "text", "required": true},
            {"name": "remarks", "label": "Remarks", "type": "textarea", "required": false}
          ]
        }'::jsonb
    WHERE NOT EXISTS (
        SELECT 1
        FROM form_templates t
        JOIN form_categories c ON c.id = t.category_id
        WHERE c.name = 'Material Issue Register'
          AND t.template ->> 'title' = 'Material Issue Register'
          AND (t.template ->> 'version')::integer = 1
    )
    RETURNING id
),
sample_report AS (
    INSERT INTO reports (project_id, subproject_id, created_by, report_date, status)
    SELECT
        (SELECT id FROM projects ORDER BY id LIMIT 1),
        (SELECT id FROM subprojects ORDER BY id LIMIT 1),
        (SELECT id FROM users ORDER BY id LIMIT 1),
        CURRENT_DATE,
        'submitted'
    WHERE NOT EXISTS (SELECT 1 FROM reports WHERE report_date = CURRENT_DATE AND created_by = (SELECT id FROM users ORDER BY id LIMIT 1))
    RETURNING id
),
report_id AS (
    SELECT COALESCE(
        (SELECT id FROM sample_report),
        (SELECT id FROM reports ORDER BY id DESC LIMIT 1)
    ) AS id
),
dept_cat_id AS (
    SELECT id FROM form_categories WHERE name = 'Departmental Labour Register' LIMIT 1
),
receipt_cat_id AS (
    SELECT id FROM form_categories WHERE name = 'Material Receipt Register' LIMIT 1
),
issue_cat_id AS (
    SELECT id FROM form_categories WHERE name = 'Material Issue Register' LIMIT 1
)
INSERT INTO form_submissions (report_id, category_id, form_data)
SELECT
    r.id,
    c.id,
    c.form_data
FROM report_id r
CROSS JOIN (
    SELECT id, '{
      "date": "2026-06-16",
      "challan_no": "CH-001",
      "sub_contractor_name": "ABC Contractors",
      "name_of_labor": "Ramesh Kumar",
      "labour_category": "Mason",
      "no_of_mandays": 1,
      "workdone_details": "Block masonry work at Tower A",
      "approx_quantity": 12.5,
      "unit": "sqm",
      "recovery_from": "ABC Contractors",
      "recovery_rate": 150,
      "recovery_amount": 1875,
      "authorised_by": "Site Engineer",
      "debit_details": "Debit against labour recovery",
      "remarks": "Work completed"
    }'::jsonb AS form_data FROM dept_cat_id
    UNION ALL
    SELECT id, '{
      "date": "2026-06-16",
      "time_in": "2026-06-16T09:30:00",
      "po_no": "PO-2026-001",
      "grn_no": "GRN-001",
      "material_description": "OPC Cement 50kg bags",
      "unit": "bags",
      "supplier": "XYZ Cement Suppliers",
      "quantity_received": 500,
      "quantity_rejected": 5,
      "quantity_accepted": 495,
      "remarks": "Received as per PO"
    }'::jsonb AS form_data FROM receipt_cat_id
    UNION ALL
    SELECT id, '{
      "date": "2026-06-16",
      "time": "2026-06-16T14:15:00",
      "issue_slip_no": "IS-001",
      "issue_slip_date": "2026-06-16",
      "wo_no": "WO-2026-001",
      "contractor_name": "ABC Contractors",
      "grn_no": "GRN-001",
      "material_name": "OPC Cement",
      "unit": "bags",
      "qty_issued": 100,
      "qty_returned": 2,
      "milestone_details": "Foundation work",
      "wbs_1": "WBS-A",
      "wbs_2": "WBS-A-01",
      "location": "Tower A Foundation",
      "remarks": "Issued for day work"
    }'::jsonb AS form_data FROM issue_cat_id
) c
WHERE r.id IS NOT NULL;

COMMIT;
