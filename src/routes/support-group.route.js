require("dotenv").config();
const express = require("express");
const router = express.Router();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram");

const apiId = Number(process.env.TG_APIID);
const apiHash = process.env.TG_APIHASH;
const stringSession = new StringSession(process.env.TG_SESSION || "");

const ADMIN_NUMBER = process.env.ADMIN_NUMBER;
const ADVISOR_NUMBER = process.env.ADVISOR_NUMBER;

let client;

// Initialize Telegram client
(async () => {
  try {
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      debug: true, // Enable debug logs for troubleshooting
    });
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      console.log("❌ Session not authorized");
      throw new Error("Session is not authorized. Please generate a valid TG_SESSION.");
    }
    console.log("✅ Telegram client connected");
  } catch (err) {
    console.error("❌ Telegram init error:", err);
    client = null; // Set client to null to prevent usage if initialization fails
  }
})();

router.post("/create-group", async (req, res) => {
  try {
    // Validate environment variables
    if (!apiId || !apiHash || !ADMIN_NUMBER || !ADVISOR_NUMBER || !process.env.TG_SESSION) {
      return res.status(400).json({
        success: false,
        message: "Missing required environment variables (TG_APIID, TG_APIHASH, ADMIN_NUMBER, ADVISOR_NUMBER, or TG_SESSION)",
      });
    }

    // Get user phone number (hardcoded as per your code)
    const userPhone = "+918650372583";
    // Alternative: Use req.body.userPhone for dynamic input
    // const userPhone = req.body.userPhone;
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "User phone number is required",
      });
    }

    // Ensure client is connected
    console.log("Checking client connection...");
    if (!client || !(await client.isUserAuthorized())) {
      return res.status(401).json({
        success: false,
        message: "Telegram client is not connected or authorized",
      });
    }
    console.log("Client is authorized");

    // Create supergroup
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: "Supporting Private Group",
        about: "Private support group created via API",
        megagroup: true,
      })
    );

    const chat = result.chats[0];
    if (!chat) {
      return res.status(500).json({
        success: false,
        message: "Failed to create group or fetch group details",
      });
    }

    const groupId = chat.id.toString();

    // Add admin, advisor, and user to the group
    const phoneNumbersToAdd = [ADMIN_NUMBER, ADVISOR_NUMBER, userPhone];
    for (const phone of phoneNumbersToAdd) {
      try {
        // Resolve user by phone number
        const userResult = await client.invoke(
          new Api.contacts.ResolvePhone({
            phone,
          })
        );

        if (userResult.users && userResult.users[0]) {
          const user = userResult.users[0];
          await client.invoke(
            new Api.channels.InviteToChannel({
              channel: chat,
              users: [user],
            })
          );

          // Set admin privileges for ADMIN_NUMBER and ADVISOR_NUMBER
          if (phone === ADMIN_NUMBER || phone === ADVISOR_NUMBER) {
            await client.invoke(
              new Api.channels.EditAdmin({
                channel: chat,
                userId: user,
                adminRights: new Api.ChatAdminRights({
                  changeInfo: true,
                  postMessages: true,
                  editMessages: true,
                  deleteMessages: true,
                  banUsers: true,
                  inviteUsers: true,
                  pinMessages: true,
                  addAdmins: true,
                }),
                rank: phone === ADMIN_NUMBER ? "Admin" : "Advisor",
              })
            );
          }
          console.log(`✅ Added user ${phone} to group`);
        } else {
          console.warn(`⚠️ User with phone ${phone} not found`);
        }
      } catch (err) {
        console.error(`❌ Error adding user ${phone}:`, err);
      }
    }

    // Create invite link with join request
    const exportResult = await client.invoke(
      new Api.messages.ExportChatInvite({
        peer: chat,
        expireDate: 0,
        usageLimit: 0,
        requestNeeded: true, // Require admin approval
        title: "Secure Invite",
      })
    );

    const inviteLink = exportResult.link;

    // Handle join requests to allow only the specified user
    client.addEventHandler(async (update) => {
      if (update.className === "UpdateBotChatInviteRequester") {
        const user = update.user;
        const userPhoneFromUpdate = user.phone ? `+${user.phone}` : null;

        if (userPhoneFromUpdate === userPhone) {
          await client.invoke(
            new Api.messages.HideChatJoinRequest({
              peer: chat,
              userId: user.id,
              approved: true,
            })
          );
          console.log(`✅ Approved join request for: ${userPhoneFromUpdate}`);
        } else {
          await client.invoke(
            new Api.messages.HideChatJoinRequest({
              peer: chat,
              userId: user.id,
              approved: false,
            })
          );
          console.log(`❌ Rejected join request for: ${userPhoneFromUpdate || "unknown"}`);
        }
      }
    });

    // Set default banned rights to restrict non-members
    await client.invoke(
      new Api.messages.EditChatDefaultBannedRights({
        peer: chat,
        bannedRights: new Api.ChatBannedRights({
          viewMessages: false,
          sendMessages: false,
          sendMedia: false,
          sendStickers: false,
          sendGifs: false,
          sendGames: false,
          sendInline: false,
          embedLinks: false,
          inviteUsers: false,
          untilDate: 0, // Permanent restriction
        }),
      })
    );

    res.json({
      success: true,
      groupId,
      inviteLink,
      message: "Group created successfully. Only the specified user can join via the invite link.",
    });
  } catch (err) {
    console.error("❌ Error creating group:", err);
    if (err.errorMessage?.includes("FLOOD_WAIT")) {
      const waitTime = err.seconds || 60;
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;