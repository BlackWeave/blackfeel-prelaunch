-- backend/migrations/update_fulfillment.sql

CREATE TABLE fulfillment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES designs(id),
    
    -- Technical Specs for Printer
    tshirt_color VARCHAR(20) NOT NULL,
    tshirt_size VARCHAR(10) NOT NULL,
    print_mockup_url VARCHAR(1024) NOT NULL, -- The 'Baked' Image
    raw_design_url VARCHAR(1024) NOT NULL,   -- The Transparent PNG
    
    -- Status Tracking
    production_status VARCHAR(50) DEFAULT 'queued', -- queued, printing, shipped
    printer_notified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fulfillment_order_id ON fulfillment_queue(order_id);
CREATE INDEX idx_fulfillment_status ON fulfillment_queue(production_status);