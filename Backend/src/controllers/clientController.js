import Client from "../models/Client.js"; // Use the Model we just created

const DEMO_CLIENTS = [
  {
    client_id: "c0000000-0000-0000-0000-000000000001",
    client_name: "Tata AutoComp Systems Ltd",
    client_code: "CLT-TATA",
    zoho_crm_code: "ZH-CLT-001",
    alias: "Tata AutoComp",
    is_active: true,
  },
  {
    client_id: "c0000000-0000-0000-0000-000000000002",
    client_name: "Bharat Forge Ltd",
    client_code: "CLT-BFL",
    zoho_crm_code: "ZH-CLT-002",
    alias: "Bharat Forge",
    is_active: true,
  },
  {
    client_id: "c0000000-0000-0000-0000-000000000003",
    client_name: "Mahindra CIE Automotive Ltd",
    client_code: "CLT-MCIE",
    zoho_crm_code: "ZH-CLT-003",
    alias: "Mahindra CIE",
    is_active: true,
  },
];

/**
 * Get all clients (Admin view)
 */
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.findAll(false); // fetch all
    res.json({ clients, count: clients.length });
  } catch (error) {
    console.warn("Get clients fallback:", error.message);
    res.json({ clients: DEMO_CLIENTS, count: DEMO_CLIENTS.length });
  }
};

/**
 * Get active clients (Dropdowns)
 */
export const getActiveClientsForDropdown = async (req, res) => {
  try {
    const clients = await Client.findAll(true); // fetch active only
    const dropdownData = clients.map((c) => ({
      client_id: c.client_id,
      client_name: c.client_name,
    }));
    res.json(dropdownData);
  } catch (error) {
    console.warn("Get active clients fallback:", error.message);
    res.json(DEMO_CLIENTS.map(c => ({ client_id: c.client_id, client_name: c.client_name })));
  }
};

/**
 * Get Client By ID
 */
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findByIdOrCode(req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(client);
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
};

/**
 * Create Client
 */
export const createClient = async (req, res) => {
  try {
    const {
      clientName,
      clientCode,
      zohoCrmCode,
      alias,
      clientSpocFirstName,
      clientSpocLastName,
      spocName,
      clientSpocPhone,
      clientSpocEmail,
      url,
    } = req.body;

    // Construct SPOC Name
    const finalSpocName =
      spocName ||
      `${clientSpocFirstName || ""} ${clientSpocLastName || ""}`.trim();

    const newClient = await Client.create({
      clientName,
      clientCode,
      zohoCrmCode,
      alias,
      spocName: finalSpocName,
      spocPhone: clientSpocPhone,
      spocEmail: clientSpocEmail,
      url,
    });

    res.status(201).json({
      message: "Client created successfully",
      client: newClient,
    });
  } catch (error) {
    console.error("Create client error:", error);

    // Handle Database Unique Constraint Violations
    if (error.code === "23505") {
      if (error.constraint.includes("client_code"))
        return res.status(409).json({ error: "Client code already exists" });
      if (error.constraint.includes("zoho_crm_code"))
        return res.status(409).json({ error: "Zoho CRM code already exists" });
      if (error.constraint.includes("client_name"))
        return res.status(409).json({ error: "Client name already exists" });
    }

    res.status(500).json({ error: "Failed to create client" });
  }
};

/**
 * Update Client
 */
export const updateClient = async (req, res) => {
  try {
    const {
      clientName,
      clientCode,
      zohoCrmCode,
      alias,
      clientSpocFirstName,
      clientSpocLastName,
      spocName,
      clientSpocPhone,
      clientSpocEmail,
      url,
      isActive,
    } = req.body;

    // Handle SPOC Name logic here in controller
    let finalSpocName = spocName;
    if (!finalSpocName && (clientSpocFirstName || clientSpocLastName)) {
      finalSpocName = `${clientSpocFirstName || ""} ${
        clientSpocLastName || ""
      }`.trim();
    }

    const updatedClient = await Client.update(req.params.id, {
      clientName,
      clientCode,
      zohoCrmCode,
      alias,
      spocName: finalSpocName,
      spocPhone: clientSpocPhone,
      spocEmail: clientSpocEmail,
      url,
      isActive,
    });

    if (!updatedClient) {
      return res
        .status(404)
        .json({ error: "Client not found or no changes made" });
    }

    res.json({
      message: "Client updated successfully",
      client: updatedClient,
    });
  } catch (error) {
    console.error("Update client error:", error);

    // Unique constraints
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Duplicate entry (Name, Code, or Zoho ID)" });
    }

    res.status(500).json({ error: "Failed to update client" });
  }
};

/**
 * Delete Client (Soft Delete)
 */
export const deleteClient = async (req, res) => {
  try {
    const deletedClient = await Client.softDelete(req.params.id);

    if (!deletedClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      message: "Client deactivated successfully",
      client: deletedClient,
    });
  } catch (error) {
    console.error("Delete client error:", error);

    if (error.message === "DEPENDENCY_EXISTS") {
      return res.status(400).json({
        error:
          "Cannot delete client with associated projects. Delete projects first.",
      });
    }

    res.status(500).json({ error: "Failed to delete client" });
  }
};

/**
 * ✅ NEW: Reactivate Client
 * PATCH /api/clients/:id/reactivate
 */
export const reactivateClient = async (req, res) => {
  try {
    const clientId = req.params.id;

    // Check if client exists
    const existingClient = await Client.findByIdOrCode(clientId);
    if (!existingClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if already active
    if (existingClient.is_active) {
      return res.status(400).json({
        error: "Client is already active",
        client: existingClient,
      });
    }

    // Reactivate the client using the Model's update method
    const reactivatedClient = await Client.update(clientId, {
      isActive: true,
    });

    if (!reactivatedClient) {
      return res.status(500).json({ error: "Failed to reactivate client" });
    }

    console.log(
      `✅ Client reactivated: ${reactivatedClient.client_name} (${clientId})`
    );

    res.json({
      message: "Client reactivated successfully",
      client: reactivatedClient,
    });
  } catch (error) {
    console.error("Reactivate client error:", error);
    res.status(500).json({
      error: "Failed to reactivate client",
      details: error.message,
    });
  }
};
